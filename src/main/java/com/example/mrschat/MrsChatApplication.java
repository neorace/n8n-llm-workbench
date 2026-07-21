package com.example.mrschat;

import com.example.mrschat.config.AppWebhookProperties;
import com.example.mrschat.config.ChatModelProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({ChatModelProperties.class, AppWebhookProperties.class})
public class MrsChatApplication {

    public static void main(String[] args) {
        SpringApplication.run(MrsChatApplication.class, args);
    }
}
