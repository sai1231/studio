# main.py
import firebase_admin
from firebase_functions import firestore_fn, options
import sys

# Initialize the Firebase Admin SDK.
firebase_admin.initialize_app()

# Set the region for the function.
options.set_global_options(region="us-central1")

@firestore_fn.on_document_created("content/{contentId}")
def process_new_content(event: firestore_fn.Event[firestore_fn.Change]) -> None:
    """
    Triggers when a new document is created in the 'content' collection.
    If the document has an 'imageUrl', it adds 'ispythonexecuted: True'.
    """
    content_id = event.params.get("contentId")
    try:
        print(f"--- Function triggered for content ID: {content_id} ---")

        if not event.data or not event.data.after:
            print(f"Content ID {content_id}: Event data or 'after' snapshot is missing. Exiting.")
            return

        data = event.data.after.to_dict()

        if not data:
            print(f"Content ID {content_id}: Document data is empty. Exiting.")
            return

        # Check if the 'imageUrl' field exists and has a value.
        if "imageUrl" in data and data["imageUrl"]:
            print(f"Content ID {content_id}: Found imageUrl. Attempting to update document.")
            
            document_ref = event.data.after.reference
            document_ref.update({"ispythonexecuted": True})
            
            print(f"Content ID {content_id}: Successfully updated with 'ispythonexecuted: True'.")
        else:
            print(f"Content ID {content_id}: No imageUrl found in data, or it was empty. No action taken.")
            print(f"Content ID {content_id}: Document keys are: {list(data.keys())}")

    except Exception as e:
        print(f"Content ID {content_id}: An unexpected error occurred: {e}", file=sys.stderr)
        # It's useful to log the full traceback for debugging
        import traceback
        traceback.print_exc(file=sys.stderr)

    return
