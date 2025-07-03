# main.py
import firebase_admin
from firebase_functions import firestore_fn, options

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

    # Get the ID and data of the document that was created.
    content_id = event.params.get("contentId")
    data = event.data.after.to_dict()

    if not data:
        print(f"Content ID {content_id}: No data in document, exiting.")
        return

    # Check if the 'imageUrl' field exists and has a value.
    if data.get("imageUrl"):
        print(f"Content ID {content_id}: Found imageUrl. Updating document.")
        try:
            # Get a reference to the document and update it.
            document_ref = event.data.after.reference
            document_ref.update({"ispythonexecuted": True})
            print(f"Content ID {content_id}: Successfully updated with 'ispythonexecuted: True'.")
        except Exception as e:
            print(f"Content ID {content_id}: Error updating document: {e}")
    else:
        print(f"Content ID {content_id}: No imageUrl found, no action taken.")

    return
