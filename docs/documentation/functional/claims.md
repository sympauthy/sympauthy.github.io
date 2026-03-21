# Claims

A **claim** is a piece of information about an end-user — their name, email address, preferred language, or any other
detail relevant to your application. When a client needs to know something about the user who just logged in, it reads
it from the claims provided by SympAuthy.

SympAuthy acts as a central repository for these claims: a user fills in their information once, and all clients sharing
the same authorization server can access it without asking the user again.

Claims are protected by [consentable scopes](/documentation/functional/scope#consentable-scope) — a client can
only access a claim if the end-user has explicitly consented to the corresponding scope.

Out of the box, SympAuthy supports all claims standardized in
the [OpenID specification](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims). They are referred to
as [OpenID Connect claims](#openid-connect-claims) throughout this documentation.

In addition to [OpenID Connect claims](#openid-connect-claims), you can define your own claims about the end-user to
centralize additional information you want to share between the clients of this authorization server. Those are referred
to as [custom claims](#custom-claims) throughout this documentation.

## OpenID Connect claims

OpenID Connect claims are claims defined by
the [OpenID Connect specification](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims). They cover the
most common pieces of user information: `name`, `email`, `phone_number`, `birthdate`, `locale`, and more.

Because they follow a shared specification, OpenID Connect claims are understood by any OpenID Connect-compatible
library or service without any custom integration work on your part.

SympAuthy supports all OpenID Connect claims out of the box. You only need to enable the ones you want to collect.

## Custom claims

When the OpenID Connect claims do not cover a piece of information specific to your application — for example, a
subscription plan or an internal user role — you can define your own **custom claims**.

Custom claims work like OpenID Connect claims: SympAuthy collects and stores the value, and shares it with your clients.
The
difference is that their identifier and data type are defined by you, so only your own clients will know how to
interpret them.

## Configuration

Both OpenID Connect and custom claims must be enabled in the configuration before SympAuthy starts collecting them. Refer to
the [configuration](/documentation/technical/configuration#claims-id) section for the full list of options.
