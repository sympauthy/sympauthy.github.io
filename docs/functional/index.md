# SympAuthy

**SympAuthy** is an open source authentication & authorization server. It provides:
- authentication of end-users and applications.
- authorization of end-users and applications.
- end-user account management.

It is designed to be an open-source, on premise alternative to commercial solutions like Firebase Authentication, Microsoft AzureAD B2C and Amazon Cognito.

Its main design concepts are:
- **[audience](/functional/audience)-based grouping**: SympAuthy groups clients into audiences. An audience represents a logical application or a set of related services sharing the same end-users and consents.
- **on premise**: SympAuthy is designed to be deployed alongside your applications and used only by your applications.
- **OAuth2 & OpenID compliant**: you can interface your app to your SympAuhty instance using any compliant OAuth2 or OpenID client library. **Ex.** Spring security OAuth2.
- **easy to configure**: all the configuration can be done through configuration files or environment variables.
- **easy to deploy**: you are able to deploy your own instances of SympAuthy in your infrastructure in a matter of minutes.

## Typography

- ```<param>```: Refers to the value of a configuration parameter. You can find more details about it in the [configuration](/technical/configuration/) section of this documentation.

## Table of Contents

- [How it works](how_it_works)

**Clients & Audiences**
- [Audience](audience)
- [Client](client)

**Authentication**
- [Authentication](authentication)
- [Interactive Flow](interactive_flow)

**User Accounts**
- [Invitation](invitation)
- [End-User Management](end-user_management)

**Authorization**
- [Scopes](scope)
- [Consent](consent)
- [User Authorization](user_authorization)
- [Client Authorization](client_authorization)

**Tokens & Claims**
- [Claims](claims)
- [Tokens](tokens)
