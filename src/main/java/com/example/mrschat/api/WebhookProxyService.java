package com.example.mrschat.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

@Service
public class WebhookProxyService {

    private static final Logger log = LoggerFactory.getLogger(WebhookProxyService.class);

    private final RestTemplate restTemplate;
    private final String webhookTestUrl;
    private final String webhookServiceUrl;
    private final String ragChatbotTestUrl;
    private final String ragChatbotServiceUrl;

    public WebhookProxyService(
            RestTemplate restTemplate,
            @Value("${app.webhook-test-url}") String webhookTestUrl,
            @Value("${app.webhook-service-url}") String webhookServiceUrl,
            @Value("${app.rag-chatbot-test-url}") String ragChatbotTestUrl,
            @Value("${app.rag-chatbot-service-url}") String ragChatbotServiceUrl
    ) {
        this.restTemplate = Objects.requireNonNull(restTemplate, "restTemplate must not be null");
        this.webhookTestUrl = Objects.requireNonNull(webhookTestUrl, "webhookTestUrl must not be null");
        this.webhookServiceUrl = Objects.requireNonNull(webhookServiceUrl, "webhookServiceUrl must not be null");
        this.ragChatbotTestUrl = Objects.requireNonNull(ragChatbotTestUrl, "ragChatbotTestUrl must not be null");
        this.ragChatbotServiceUrl = Objects.requireNonNull(ragChatbotServiceUrl, "ragChatbotServiceUrl must not be null");
    }

    @SuppressWarnings("null")
    public String send(ChatRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("model", request.model());
        payload.put("message", request.message());
        payload.put("sessionid", request.sessionid());
        payload.put("mode", request.mode() == null ? "" : request.mode());
        payload.put("promptPreset", request.promptPreset() == null ? "" : request.promptPreset());
        payload.put("systemMessage", request.systemMessage() == null ? "" : request.systemMessage());
        payload.put("tableName", request.tableName() == null ? "" : request.tableName());

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(payload, headers);
        boolean ragMode = isRagChat(request);
        boolean serviceMode = "service".equalsIgnoreCase(request.mode());
        String targetUrl;
        if (ragMode) {
            targetUrl = serviceMode ? ragChatbotServiceUrl : ragChatbotTestUrl;
        } else {
            targetUrl = serviceMode ? webhookServiceUrl : webhookTestUrl;
        }

        log.info(
                "Chat webhook target={} ragMode={} mode={} promptPreset={} tableName={}",
                targetUrl,
                ragMode,
                request.mode(),
                request.promptPreset(),
                request.tableName()
        );

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);
            return response.getBody() == null ? "" : response.getBody();
        } catch (RestClientException e) {
            throw new IllegalStateException("Webhook call failed: " + e.getMessage(), e);
        }
    }

    private static boolean isRagChat(ChatRequest request) {
        if (Boolean.TRUE.equals(request.ragMode())) {
            return true;
        }
        return "rag".equalsIgnoreCase(request.promptPreset());
    }
}
