package com.example.mrschat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "mrs.chat")
public class ChatModelProperties {

    private List<ModelOption> models = new ArrayList<>();

    public List<ModelOption> getModels() {
        return models.stream()
                .filter(ModelOption::isValid)
                .toList();
    }

    public void setModels(List<ModelOption> models) {
        this.models = models == null ? new ArrayList<>() : new ArrayList<>(models);
    }

    public record ModelOption(String label, String value) {
        boolean isValid() {
            return label != null && !label.isBlank() && value != null && !value.isBlank();
        }
    }
}
