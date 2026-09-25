# Notisend
Server to send notification : email, notification push, etc.

## Configuration
### Generate API_KEY token
```shell
node -e "
      console.log('APP_KEYS=' + require('crypto').randomBytes(64).toString('base64'));
"
```

### Set smtp configuration
Duplicate `.env.example` to `.env` and set avaible values

`MAIL_FROM` is a JSON list of senders, one per application:

```
MAIL_FROM='[{"app":"techwatch","email":"TECHWATCH <noreply@techwatch.meindonsa.com>"},{"app":"facturly","email":"FACTURLY <noreply@facturly.meindonsa.com>"}]'
```

Each app using notisend must identify itself with the `app` field in the request body.

### Build

```
npm install
npm run dev
```

```
open http://localhost:3000
```

## Usage

Ex:
```shel
curl -X POST http://localhost:3000/api/mail/send   -H "Content-Type: application/json"   -H "x-api-key: API_KEY"   -d '{
    "app": "facturly",
    "to": "<YOUR_EMAIL>",
    "subject": "Test",
    "html": "<p>it works !</p>"
  }'
```
