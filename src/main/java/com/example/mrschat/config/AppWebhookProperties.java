package com.example.mrschat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppWebhookProperties {

    private String webhookTestUrl = "";
    private String webhookServiceUrl = "";
    private String ragWebhookTestUrl = "";
    private String ragWebhookServiceUrl = "";
    private String ragChatbotTestUrl = "";
    private String ragChatbotServiceUrl = "";
    private String textExtractorTestUrl = "";
    private String textExtractorServiceUrl = "";

    public String getWebhookTestUrl() {
        return webhookTestUrl;
    }

    public void setWebhookTestUrl(String webhookTestUrl) {
        this.webhookTestUrl = webhookTestUrl == null ? "" : webhookTestUrl;
    }

    public String getWebhookServiceUrl() {
        return webhookServiceUrl;
    }

    public void setWebhookServiceUrl(String webhookServiceUrl) {
        this.webhookServiceUrl = webhookServiceUrl == null ? "" : webhookServiceUrl;
    }

    public String getRagWebhookTestUrl() {
        return ragWebhookTestUrl;
    }

    public void setRagWebhookTestUrl(String ragWebhookTestUrl) {
        this.ragWebhookTestUrl = ragWebhookTestUrl == null ? "" : ragWebhookTestUrl;
    }

    public String getRagWebhookServiceUrl() {
        return ragWebhookServiceUrl;
    }

    public void setRagWebhookServiceUrl(String ragWebhookServiceUrl) {
        this.ragWebhookServiceUrl = ragWebhookServiceUrl == null ? "" : ragWebhookServiceUrl;
    }

    public String getRagChatbotTestUrl() {
        return ragChatbotTestUrl;
    }

    public void setRagChatbotTestUrl(String ragChatbotTestUrl) {
        this.ragChatbotTestUrl = ragChatbotTestUrl == null ? "" : ragChatbotTestUrl;
    }

    public String getRagChatbotServiceUrl() {
        return ragChatbotServiceUrl;
    }

    public void setRagChatbotServiceUrl(String ragChatbotServiceUrl) {
        this.ragChatbotServiceUrl = ragChatbotServiceUrl == null ? "" : ragChatbotServiceUrl;
    }

    public String getTextExtractorTestUrl() {
        return textExtractorTestUrl;
    }

    public void setTextExtractorTestUrl(String textExtractorTestUrl) {
        this.textExtractorTestUrl = textExtractorTestUrl == null ? "" : textExtractorTestUrl;
    }

    public String getTextExtractorServiceUrl() {
        return textExtractorServiceUrl;
    }

    public void setTextExtractorServiceUrl(String textExtractorServiceUrl) {
        this.textExtractorServiceUrl = textExtractorServiceUrl == null ? "" : textExtractorServiceUrl;
    }
}
