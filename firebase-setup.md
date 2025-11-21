# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: todolistmemo)
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

## 2. Firestore Database 활성화

1. Firebase Console에서 프로젝트 선택
2. 왼쪽 메뉴에서 "Firestore Database" 클릭
3. "데이터베이스 만들기" 클릭
4. "테스트 모드에서 시작" 선택 (나중에 보안 규칙 설정 가능)
5. 위치 선택 (asia-northeast3 - 서울 권장)
6. "사용 설정" 클릭

## 3. 웹 앱 등록

1. 프로젝트 설정(톱니바퀴 아이콘) 클릭
2. "일반" 탭에서 "앱 추가" > 웹 아이콘 선택
3. 앱 닉네임 입력 (예: todolistmemo-web)
4. "앱 등록" 클릭
5. Firebase SDK 설정 값 복사

## 4. 환경 변수 설정

`.env.local` 파일에 Firebase 설정 값을 입력하세요:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=여기에_API_키_입력
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=프로젝트ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=프로젝트ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=프로젝트ID.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=여기에_메시징_센더_ID_입력
NEXT_PUBLIC_FIREBASE_APP_ID=여기에_앱_ID_입력
```

## 5. Firestore 보안 규칙 설정 (선택사항)

Firestore Database > 규칙 탭에서 다음 규칙 설정:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notes/{document=**} {
      allow read, write: if true; // 테스트용 - 나중에 인증 추가 권장
    }
  }
}
```

## 6. 개발 서버 재시작

```bash
npm run dev
```

