import time
import random
import requests

BASE_URL = "http://127.0.0.1:8000"
RESIDENT_ID = 1
EMAIL = "nurse.test@example.com"
PASSWORD = "testpassword123"
INTERVAL_SECONDS = 10


def get_token():
    response = requests.post(
        f"{BASE_URL}/login",
        json={"email": EMAIL, "password": PASSWORD},
    )
    response.raise_for_status()
    return response.json()["access_token"]


def generate_reading():
    return {
        "heart_rate": round(random.uniform(65, 90), 1),
        "blood_pressure_systolic": round(random.uniform(110, 135), 1),
        "blood_pressure_diastolic": round(random.uniform(70, 88), 1),
        "spo2": round(random.uniform(94, 99), 1),
        "temperature": round(random.uniform(36.3, 37.2), 1),
    }


def main():
    token = get_token()
    print(f"Simulator started for resident {RESIDENT_ID}. Sending a reading every {INTERVAL_SECONDS}s. Press Ctrl+C to stop.")

    while True:
        reading = generate_reading()
        response = requests.post(
            f"{BASE_URL}/residents/{RESIDENT_ID}/vitals",
            json=reading,
            headers={"Authorization": f"Bearer {token}"},
        )

        if response.status_code == 401:
            print("Token expired, logging in again...")
            token = get_token()
            continue

        if response.ok:
            data = response.json()
            print(f"Sent reading at {data['recorded_at']}: HR={data['heart_rate']} SpO2={data['spo2']}")
        else:
            print(f"Failed to send reading: {response.status_code} {response.text}")

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()