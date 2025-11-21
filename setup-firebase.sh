#!/bin/bash

echo "🔥 Firebase 설정 도우미"
echo "========================"
echo ""
echo "Firebase Console (https://console.firebase.google.com)에서 프로젝트를 생성한 후"
echo "프로젝트 설정 > 일반 탭에서 웹 앱 설정 값을 가져오세요."
echo ""

read -p "Firebase API Key: " API_KEY
read -p "Firebase Auth Domain (예: project-id.firebaseapp.com): " AUTH_DOMAIN
read -p "Firebase Project ID: " PROJECT_ID
read -p "Firebase Storage Bucket (예: project-id.appspot.com): " STORAGE_BUCKET
read -p "Firebase Messaging Sender ID: " MESSAGING_SENDER_ID
read -p "Firebase App ID: " APP_ID

cat > .env.local << EOF
# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=${API_KEY}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${AUTH_DOMAIN}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT_ID}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${STORAGE_BUCKET}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${MESSAGING_SENDER_ID}
NEXT_PUBLIC_FIREBASE_APP_ID=${APP_ID}
EOF

echo ""
echo "✅ .env.local 파일이 생성되었습니다!"
echo ""
echo "다음 단계:"
echo "1. Firestore Database를 활성화하세요 (Firebase Console > Firestore Database)"
echo "2. 개발 서버를 재시작하세요: npm run dev"

