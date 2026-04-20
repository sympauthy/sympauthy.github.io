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

## Typography

- ```<param>```: Refers to the value of a configuration parameter. You can find more details about it in the [configuration](/technical/configuration/) section of this documentation.

## Table of Contents

1. [How it works](how_it_works)
2. [Client](client)
3. [Authentication](authentication)
   - [Interactive Flow](interactive_flow)
   - [Tokens](tokens)
4. [Claims](claims)
5. [Scopes](scope)
6. [User Authorization](user_authorization)
7. [Client Authorization](client_authorization)
8. [End-User Management](end-user_management)
