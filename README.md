# Tour Guidance

A web application that provides a tour guidance service.

## Install

We use poetry to manage the dependencies. You can install the dependencies by running the following command:

```bash
poetry install
```

Besides, This program needs two Google API keys:
- [Google API](https://console.cloud.google.com/)
- [Google Custom Search API](https://programmablesearchengine.google.com/controlpanel/all)

You should copy the `config.example.yaml` file to `config.yaml` and put the keys in the `config.yaml` file.
```yaml
API_KEY: "Your Google API Key"
CSE_ID: "Your Google Custom Search Engine ID"
```

## Run

Using following command to run the app:
```bash
poetry run python3 server.py
```
The server will run on `http://localhost:5000/`.