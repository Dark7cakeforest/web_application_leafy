# api/model_server.py
import os
from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image
from PIL import ImageFile
import warnings

# Allow processing very large images (we will downscale them for the model).
# The default PIL limit for total pixels can raise DecompressionBombWarning or
# trigger a safety check. Disable the check here because the server will
# immediately downscale the image to a small size (IMAGE_SIZE) before using it.
warnings.simplefilter('ignore', Image.DecompressionBombWarning)
# Also allow loading images that may be truncated in some uploads
ImageFile.LOAD_TRUNCATED_IMAGES = True
# Disable the max pixels check (set to None). If you prefer a hard limit,
# set this to a large integer instead of None.
Image.MAX_IMAGE_PIXELS = None

# --- ค่าคงที่ ---
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'model', 'plant_mv2_float32.tflite')
IMAGE_SIZE = 224
CLASS_LABELS = [
    'horapa', 'jinda', 'kaprao', 'kareang', 'kheenhu',
    'manglug', 'nhum', 'saranae', 'shifa', 'yhira'
]

# --- โหลดโมเดล ---
try:
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print("TFLite model loaded successfully.")
except Exception as e:
    print(f"Failed to load TFLite model: {e}")
    interpreter = None

# --- สร้าง Flask App ---
app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    if interpreter is None:
        return jsonify({'error': 'Model is not loaded'}), 500

    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']

    try:
        # --- เตรียมรูปภาพ ---
        image = Image.open(file.stream).convert('RGB')
        image = image.resize((IMAGE_SIZE, IMAGE_SIZE))
        image_array = np.array(image, dtype=np.float32)
        image_array = np.expand_dims(image_array, axis=0)
        image_array = image_array / 255.0  # Normalize to [0, 1]

        # --- ประมวลผล ---
        interpreter.set_tensor(input_details[0]['index'], image_array)
        interpreter.invoke()
        prediction = interpreter.get_tensor(output_details[0]['index'])[0]

        # --- หาผลลัพธ์ ---
        predicted_index = np.argmax(prediction)
        confidence = float(prediction[predicted_index])
        class_label = CLASS_LABELS[predicted_index]

        # --- ส่งผลลัพธ์กลับ ---
        return jsonify({
            'success': True,
            'predicted_index': int(predicted_index),
            'class_label': class_label,
            'confidence': confidence
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Python Model Server is starting on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=int(os.environ.get('PYTHON_PORT', 5000)))