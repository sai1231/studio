# Welcome to your first Cloud Function for Firebase in Python!
# To learn more about Cloud Functions, see the documentation:
# https://firebase.google.com/docs/functions

from firebase_admin import initialize_app
from firebase_functions import https_fn

# The Firebase Admin SDK is initialized automatically by the Cloud Functions runtime.
initialize_app()


@https_fn.on_request()
def on_request_example(req: https_fn.Request) -> https_fn.Response:
    """A simple, publicly-accessible HTTP function for testing."""
    print("HTTP function was triggered.")
    return https_fn.Response("Hello, World! The diagnostic function is deployed.")
