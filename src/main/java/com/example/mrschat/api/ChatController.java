package com.example.mrschat.api;

import com.example.mrschat.config.AppWebhookProperties;
import com.example.mrschat.config.ChatModelProperties;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ChatController {

    private final WebhookProxyService webhookProxyService;
    private final ChatModelProperties chatModelProperties;
    private final AppWebhookProperties appWebhookProperties;

    public ChatController(
            WebhookProxyService webhookProxyService,
            ChatModelProperties chatModelProperties,
            AppWebhookProperties appWebhookProperties
    ) {
        this.webhookProxyService = webhookProxyService;
        this.chatModelProperties = chatModelProperties;
        this.appWebhookProperties = appWebhookProperties;
    }

    @GetMapping("/models")
    public ResponseEntity<List<ChatModelProperties.ModelOption>> models() {
        return ResponseEntity.ok(chatModelProperties.getModels());
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> config() {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("webhookTestUrl", appWebhookProperties.getWebhookTestUrl());
        body.put("webhookServiceUrl", appWebhookProperties.getWebhookServiceUrl());
        body.put("ragWebhookTestUrl", appWebhookProperties.getRagWebhookTestUrl());
        body.put("ragWebhookServiceUrl", appWebhookProperties.getRagWebhookServiceUrl());
        body.put("ragChatbotTestUrl", appWebhookProperties.getRagChatbotTestUrl());
        body.put("ragChatbotServiceUrl", appWebhookProperties.getRagChatbotServiceUrl());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@Valid @RequestBody ChatRequest request) {
        String reply = webhookProxyService.send(request);
        return ResponseEntity.ok(Map.of("reply", reply));
    }
}
