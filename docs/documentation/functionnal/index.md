# SympAuthy

**SympAuthy** is an open source authentication & authorization server. It provides:
- authentication of end-users and applications.
- authorization of end-users and applications.
- end-user account management.

It is designed to be an open-source, on premise alternative to commercial solutions like Firebase Authentication, Microsoft AzureAD B2C and Amazon Cognito.

Its main design concepts are:
- **single audience**: SympAuthy is designed to be used by a single application or a group of applications sharing the same end-users.
- **on premise**: SympAuthy is designed to be deployed alongside your applications and used only by your applications.
- **OAuth2 & OpenID compliant**: you can interface your app to your SympAuhty instance using any compliant OAuth2 or OpenID client library. **Ex.** Spring security OAuth2.
- **easy to configure**: all the configuration can be done through configuration files or environment variables.
- **easy to deploy**: you are able to deploy your own instances of SympAuthy in your infrastructure in a matter of minutes.

## Terminology

- **authorization server**: The server issuing access tokens to the client after successfully authenticating the resource owner and obtaining authorization.
- **claim**: A piece of information collected on the end-user. They can be collected by this authorization server, transmitted by a client or obtained from a third-party provider.
- **client**: A software requiring authentication to protect its resources.
- **end-user**: A person trying to access protected resources of the client and requiring an authorization.
- **provider**: A trusted third-party service able to authenticate the user.

## Typography

- ```<param>```: Refers to the value of a configuration parameter. You can find more details about it in the [configuration](/) section of this documentation.

## Table of Contents

1. [Authentication](1%20-%20Authentication.md)
   - [Connect using OAuth2](1.1%20-%20Connect%20using%20OAuth2.md)
   - [Tokens](1.1%20-%20Tokens.md)
2. [Authorization](2%20-%20Authorization.md)
3. [End-User Management](3%20-%20End-User%20management.md)
   - [Claims](3.1%20-%20Claims.md)
6. [Integration](6%20-%20Integration.md)
   - [Well-known Providers](6.1%20-%20Well-known%20providers.md)
