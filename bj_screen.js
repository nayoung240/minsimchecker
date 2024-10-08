document.addEventListener('DOMContentLoaded', function () {
    // Initialize Materialize form components
    M.AutoInit();

    const SDK = window.AFREECA.ext;
    const extensionSdk = SDK();

    let isLoggedIn = false;
    let isBJ = false;
    let broadInfo = null; // 방송 정보
    let playerInfo = null; // 플레이어 상태 정보
    let setIntervaltimer;

    let wordCounts = {};

    const init =(auth, broad, player)=>{
        isLoggedIn = !!auth.obscureUserId;
        isBJ = auth.isBJ;

        broadInfo = broad;
        playerInfo = player;

        document.getElementById('bjnick').innerText = broadInfo.bjNickname;
    }

    extensionSdk.handleInitialization(init);

    const handleChatInfoReceived = (action, message) => {
        // console.log(action, message)

        // 타이머 중이 아닐때는 저장하지 않는다.
        if(!setIntervaltimer) return;

        switch (action) {
            case 'MESSAGE':
                const userInfo = message.userStatus;
                
                // Bj 본인 채팅은 pass
                if(userInfo.isBJ) return;

                let chat = message.message;

                const regex = /[ㄱ-ㅎㅏ-ㅣ`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/\s]/g; // 단자음,단모음,특수문자,괄호,점,공백
                chat = chat.toLowerCase().replace(regex, '').slice(0,20); // 소문자로, 제거, 20자제한

                // 빈채팅 제거
                if(!chat) return;

                if (!wordCounts[chat]) {
                    wordCounts[chat] = { total: 0, group1: 0, group2: 0, group3: 0 };
                }

                // 전체 카운트 증가
                wordCounts[chat].total += 1;

                // 그룹별 카운트
                if (userInfo.isTopFan) {
                    wordCounts[chat].group1 += 1;
                } else if (userInfo.isManager || userInfo.isFan || userInfo.isFollower || userInfo.isSupporter) {
                    wordCounts[chat].group2 += 1;
                } else {
                    wordCounts[chat].group3 += 1;
                }

                break;
            default:
                break;
        }
    }

    extensionSdk.chat.listen(handleChatInfoReceived);

    // 타이머 종료 후 결과 보여주기
    const showResult = (type) => {
        const resultTblEl = document.getElementById('resultTbl'); 
        const emptyResultEl = document.getElementById('emptyResult'); 
        const bannerEl = document.getElementById("banner");

        let filteredCounts = {};

        // 데이터가 없으면 종료
        if(Object.keys(wordCounts).length === 0) {
            // console.log('empty');
            emptyResultEl.style.display = 'block';
            return;
        }

        document.getElementById('chatReset').style.display = 'block'; // 지우기버튼 노출

        switch (type) {
            case 'topfan':
                filteredCounts = Object.fromEntries(Object.entries(wordCounts).map(([key, value]) => [key, value.group1]));
                break;
            case 'allfan':
                filteredCounts = Object.fromEntries(Object.entries(wordCounts).map(([key, value]) => [key, value.group2]));
                break;
            case 'nofan':
                filteredCounts = Object.fromEntries(Object.entries(wordCounts).map(([key, value]) => [key, value.group3]));
                break;
            case 'all':
            default:
                filteredCounts = Object.fromEntries(Object.entries(wordCounts).map(([key, value]) => [key, value.total]));
                break;
        }

        // 필터링된 데이터를 정렬하여 출력
        const sortedEntries = Object.entries(filteredCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        resultTblEl.innerHTML = '<tr><th>민심 키워드</th><th>민심도</th></tr>';

        sortedEntries.forEach(([key, value], rank) => {
            let rowColor = '';
            if (rank === 0) rowColor = 'style="background-color: #e57373;"';
            if (rank === 1) rowColor = 'style="background-color: #ffa726;"';
            if (rank === 2) rowColor = 'style="background-color: #ffe082;"';

            resultTblEl.insertAdjacentHTML('beforeend', `<tr ${rowColor}><td><b>${key}</b></td><td><b>${value}</b></td></tr>`);
        });

        resultTblEl.style.display = 'table';
        emptyResultEl.style.display = 'none';

        bannerEl.style.display = 'inline';
    }

    const startTimer = (action, minutes) => {
        const milliseconds = minutes * 60 * 1000; // 분을 밀리초로 변환
        let elapsedTime = 0;
        const limitTime = document.getElementById("limit-time");
        let sec = 60;

        setIntervaltimer = setInterval(function () {
            elapsedTime += 1000; // 1초씩 증가

            // 타이머 종료
            if (elapsedTime >= milliseconds) {
                // 초기화
                clearInterval(setIntervaltimer); 
                limitTime.innerText = '';
                setIntervaltimer = null;
                // document.getElementById('submit-btn').innerText = '다시!';
                document.getElementById('userGrade').style.display = 'block'; 
                document.getElementById('chatReset').style.display = 'none'; // 지우기 버튼 비노출
                M.toast({html: `${minutes} 분 경과로 종료합니다`});
                return;
            } 

            let min = (milliseconds - elapsedTime) /(60*1000); //초를 분으로 나눠준다.
            min = Math.floor(min); //실수로 계산되기 때문에 소숫점 아래를 버리고 출력해준다.

            if(sec > 0) { 
                sec -= 1; //sec=60 에서 1씩 빼서 출력해준다.
                limitTime.innerText = min+':'+sec;

                // 10초남았을 때 색강조
                if(min == 0 && sec <= 10) {
                    limitTime.style.color = '#ee6e73';
                }
            }
            else {
                // 0에서 -1을 하면 -59가 출력된다. 0이 되면 바로 sec을 60으로 돌려주고 value에는 0을 출력하도록 해준다.
                sec = 60;
                s = sec == 60 ? '00' : sec;
                limitTime.innerText = min+':'+s;
            } 

            // 결과 보여주기
            showResult('all');
            
        }, 1000); // 1초마다 실행
    }

    // Start or Stop
    document.getElementById('submit-btn').addEventListener('click', function (e) {
        e.preventDefault();
        const timer = document.getElementById("timer");
        const candidateForm = document.getElementById("candidate-form");
        const bannerEl = document.getElementById("banner");
        const btnStatus = e.target.dataset.status;
        const settingTime = Number(timer.value);

        if(settingTime == 0) {
            M.toast({html: '최소 1분 이상 설정바랍니다!'})
            return;
        }

        if(btnStatus == 'stop') {
            clearInterval(setIntervaltimer); // 타이머 중지
            location.reload();
            return;
        }

        e.target.dataset.status = 'stop';
        e.target.src = './img/replay.png';
        document.getElementById('trans-time').innerText = '';
        candidateForm.style.display = 'none';

        const banners = ["banner2.webp", "banner3.webp", "banner4.webp", "banner5.webp", "banner6.webp", "banner7.webp"];
        const selectedBanner = banners[Math.floor(Math.random() * banners.length)];

        bannerEl.src = './img/' + selectedBanner;
        bannerEl.style.display = 'none';

        M.toast({html: '시작합니다!'})

        // 타이머 시작
        startTimer(btnStatus, settingTime);
    });

    // 시간 input
    document.getElementById('timer').addEventListener("change", function(e) {
        // console.log('타이머 수정')
        this.value = this.value.replace(/[^0-9]/g,'');
        const inputTime = e.target.value;

        if (inputTime > 60) {
            let transSpan = document.getElementById('trans-time');

            if (inputTime > 1400) {
                M.toast({html: '1일 이상 타이머 지정은 불가합니다.'})
                this.value = 1400;
                transSpan.innerText = `24시간 0분`;
                return;
            }

            const h = Math.floor(inputTime / 60);
            const m = inputTime % 60;

            // 시와 분을 문자열로 표시
            transSpan.innerText = `${h}시간 ${m}분`;
        }
    });

    // n분 버튼
    let addTimeElAll = document.querySelectorAll('.add-time');
    addTimeElAll.forEach((target) => target.addEventListener("click", function(e){ 
        const addTime = target.dataset.time;
        const timerEl = document.getElementById('timer');

        timerEl.value = Number(timerEl.value) + Number(addTime);

        // change event trigger
        document.getElementById('timer').dispatchEvent(new Event('change'));
    }));

    // 채팅 초기화 버튼
    document.getElementById('chatReset').addEventListener('click', function (e) {
        wordCounts = {};
        document.getElementById('resultTbl').innerHTML = ''; // 초기화
    });

    // 유저타입 선택 라디오 버튼
    let ugroupElAll = document.querySelectorAll('input[name=ugroup]');
    ugroupElAll.forEach((target) => target.addEventListener("click", function(e){ 
        // 결과 보여주기
        showResult(target.dataset.grade);
    }));
});