1. LLM Workbench

LLM Workbench는 **LLM 기반 워크플로 개발 및 테스트를 지원하는 통합 도구**로, 다음과 같은 기능을 제공합니다.

* n8n으로 개발한 API(Webhook) 서비스의 호출 및 동작 테스트
* LLM 모델별 응답 결과 비교 및 성능 평가 지원
* n8n Code 노드, Java, Python 등의 코드 작성을 지원하는 코딩 어시스턴트 기능
* 특정 업무에 최적화된 System Prompt 생성 및 관리
* n8n을 통한 RAG 데이터베이스 생성 요청
* 생성된 RAG 데이터베이스의 검색 및 질의 테스트

2. application.yml

server:
  address: ${SERVER_ADDRESS:0.0.0.0}
  port: ${SERVER_PORT:9183}

app:
  webhook-test-url: "http://{N8N-HOST}:{N8N-PORT}/webhook-test/mrs-chat"  
  webhook-service-url: "http://{N8N-HOST}:{N8N-PORT}/webhook/mrs-chat"  
  rag-webhook-test-url: "http://{N8N-HOST}:{N8N-PORT}/webhook-test/n8nragv1"  
  rag-webhook-service-url: "http://{N8N-HOST}:{N8N-PORT}/webhook/n8nragv1"  
  rag-chatbot-test-url: "http://{N8N-HOST}:{N8N-PORT}/webhook-test/rag-chatbot"  
  rag-chatbot-service-url: "http://{N8N-HOST}:{N8N-PORT}/webhook/rag-chatbot"  
  text-extractor-test-url: "http://{N8N-HOST}:{N8N-PORT}/webhook-test/text-extrator"  
  text-extractor-service-url: "http://{N8N-HOST}:{N8N-PORT}/webhook-test/text-extrator"  
  
  chat:  
    models:  
      - label: google-gemma4-E4B  
        value: google-gemma4-E4B  
      - label: Qwen3-30B-A3B  
        value: Qwen3-30B-A3B  
      - label: Qwen3-VL-8B-Ins  
        value: Qwen3-VL-8B  

            
### LLM Workbench UI
> RAG 실행 설정 → 검색 결과 응답 → n8n Code Asistant → 시스템 프롬프트 프리셋을 한 화면에서 확인할 수 있는 워크벤치 화면입니다.
>RAG 
<img width="1529" height="979" alt="image" src="https://github.com/user-attachments/assets/e2486a49-df1e-4b2c-9682-b38cf2e782c7" />
>n8n Code Asistant
<img width="1529" height="979" alt="image" src="https://github.com/user-attachments/assets/63674d85-1c9d-46e9-af30-ff4f0264f119" />
> system prompt Asistant
<img width="1529" height="979" alt="image" src="https://github.com/user-attachments/assets/a07f3b54-0f4d-4dfb-b34b-f7e57bc5f00c" />





