import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://bingo-mobile-app.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def guest_user(api_client, base_url):
    r = api_client.post(f"{base_url}/api/guest/login", json={"device_id": f"TEST_device_{os.getpid()}"})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="session")
def second_guest(api_client, base_url):
    r = api_client.post(f"{base_url}/api/guest/login", json={"device_id": f"TEST_device2_{os.getpid()}"})
    assert r.status_code == 200, r.text
    return r.json()
