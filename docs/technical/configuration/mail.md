# Mail

This authorization server can email a user through the use
of [Micronaut Email](https://micronaut-projects.github.io/micronaut-email/latest/guide/).

The SMTP client implementation was chosen because it can be easily integrated with the most commonly used mailing
solutions on the market:

- [Amazon Simple Email Service](https://docs.aws.amazon.com/en_us/ses/latest/dg/send-email-smtp.html).
- [Sendgrid](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api).
- etc.

## ```javamail```

| Key                  | Type    | Description                                                                                                                                                                                                   | Required<br>Default |
|----------------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```enabled```        | boolean | Set to ```true``` to enable sending emails. If mails are enable but the configuration is missing, it will fail to start with the following message: *JavaMail configuration does not contain any properties.* | NO                  |
| ```authentication``` | object  | Contains the username and the password to authenticate to the SMTP server.                                                                                                                                    | NO                  |
| ```properties```     | object  | Configuration of the SMTP library using its [properties](https://eclipse-ee4j.github.io/angus-mail/docs/api/org.eclipse.angus.mail/org/eclipse/angus/mail/smtp/package-summary.html#properties).              | **YES**             |

**Example**:

```yaml
javamail:
  enabled: true
  authentication:
    username: username
    password: password
  properties:
    mail:
      from: noreply@example.com
      smtp:
        host: ssl.smtp.example.com
        port: 465
        ssl:
          enable: true
```

### ```javamail.authentication```

| Key              | Type   | Description                                        | Required<br>Default |
|------------------|--------|----------------------------------------------------|---------------------|
| ```username```   | string | Username to authenticate to the SMTP server.       | **YES**             |
| ```password```   | string | Password to authenticate to the SMTP server.       | **YES**             |
