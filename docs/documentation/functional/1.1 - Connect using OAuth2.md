# Connect using clients

You can use any client that supports:
- Authorization code grant flow for end-user
- 

## Register a client

Firstly you need to register a client for your application. It mostly consists in two keys that will allow SympAuthy to identify the authentication has been initiated by your application and not by a malveillant third party.

You need to define two information to register a client:
- **client id**: A chain of characters 
- **client secret**: A secret chain of characters shared only between SympAuthy and your client.

As stated in the design, registration of client si done through the configuration. **Ex.** using an yaml configuration file.

```yaml
clients:
  <client id>:
    secret: <client secret>
```

## Configure an OpenID client

SympAuthy supports [OpenID discovery](https://openid.net/specs/openid-connect-discovery-1_0.html). You can easily any compatible client by providing the URL of the configuration:

```<urls.root>/.well-known/openid-configuration```

The configuration will help the client to discover the authorize endpoint and the token endpoint. You will still have to configure a client since SympAuthy does not support dynamic clients.

> Some clients, like Spring security, requires to match the issuer emitted in tokens (configured in ```<auth.issuer>```) to the ```<urls.root>```. Make sure to match those values in the configuration.

## Configure an OAuth2 client

If your client does not supports any discovery protocol, you can still configure the authorize endpoint, the token endpoint and the userinfo endpoint manually in 

### Authorize endpoint

```<urls.root>/api/oauth2/authorize```

#### Authentication

The token supports passing the **client id** and the **client secret** 

### Userinfo endpoint

```<url.root>/api/openid/userinfo```


<!--stackedit_data:
eyJoaXN0b3J5IjpbLTE4MTQ4NTI1MSwtMzAxMjczMywxNDU3MT
EzOTA5LDE3OTU1MzAwNCwtMTkyMTc5MTU3Niw5OTU3MjgwMjYs
MTA1OTQ3NjMzLC0xODY1MzQ5MzY4XX0=
-->