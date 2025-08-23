from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import cv2
import os

# Import your custom preprocessing and feature extraction
from utils.chl_preprocess import preprocess
from utils.chl_features import extract_features

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from any domain

# Load the trained Random Forest model
model_path = os.path.join("models", "chlorine_model.pkl")
model = joblib.load(model_path)

@app.route("/")
def index():
    return jsonify({"message": "Chlorine Detection API is running"}), 200

@app.route("/predict", methods=["POST"])
def predict():
    # Check if image file is in the request
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]

    # Read image as OpenCV format
    img_array = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if img is None:
        return jsonify({"error": "Invalid image data"}), 400

    try:
        # Preprocess and extract features
        processed_img = preprocess(img)
        features = extract_features(processed_img)

        # Predict chlorine PPM
        ppm = model.predict([features])[0]

        return jsonify({"ppm": round(float(ppm), 2)})
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# For local testing only — Render uses gunicorn for production
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
