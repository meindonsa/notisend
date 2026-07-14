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

### Build

```
npm install
npm run dev
```

```
open http://localhost:3000
```