# HTTP Request Builder

The HTTP Request Builder simulates crafting HTTP requests and outputs a ready-to-run
`curl` command. It never sends network traffic – the UI is a sandbox for rehearsing
requests before pasting them into a terminal.

## Supported methods

The form validates and previews the following verbs:

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`
- `HEAD`
- `OPTIONS`

Payload validation is enabled automatically when `Content-Type: application/json`
is present. Methods that traditionally avoid bodies (`HEAD`, `OPTIONS`, `GET`) trigger
an error if a payload is supplied so the preview mirrors real-world expectations.

## Offline canned responses

Three curated examples ship with the app so the experience works without API access:

1. **Sample: Fetch JSONPlaceholder post** – illustrates a `GET` request with caching
   headers and a JSON body preview.
2. **Sample: Create JSONPlaceholder post** – demonstrates a `POST` request and a
   simulated `201 Created` response with a `Location` header.
3. **Sample: Service health check** – shows how a `HEAD` probe reports status codes
   without returning a body.

Selecting an example pre-fills the form, updates the curl preview, and loads the
matching mock response. Running the simulation records the request in the local
history log alongside status metadata so testers can verify offline flows.
