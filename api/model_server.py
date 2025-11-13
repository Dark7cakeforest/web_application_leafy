# api/model_server.py
import os
import json
import warnings
from datetime import datetime, timezone, timedelta

import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
from PIL import Image, ImageFile

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
OTHER_RESULTS_PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'other_results.txt')

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
        image_array = (image_array / 127.5) - 1.0  # Normalize to [-1, 1] for MobileNetV2

        # --- ประมวลผล ---
        interpreter.set_tensor(input_details[0]['index'], image_array)
        interpreter.invoke()
        prediction = interpreter.get_tensor(output_details[0]['index'])[0]
        raw_scores = [float(score) for score in prediction]
        timestamp = (datetime.now(timezone.utc) + timedelta(hours=7)).isoformat()

        print(f"AI prediction scores: {raw_scores}, timestamp: {timestamp}")

        try:
            line_to_write = f"{json.dumps(raw_scores)}, {timestamp}"
            last_line = None
            last_scores = None
            lines = []
            if os.path.exists(OTHER_RESULTS_PATH):
                with open(OTHER_RESULTS_PATH, 'r', encoding='utf-8') as results_file:
                    lines = results_file.readlines()
                for existing_line in lines:
                    stripped = existing_line.strip()
                    if stripped:
                        last_line = stripped
                if last_line:
                    try:
                        score_segment = last_line.split(']', 1)[0] + ']'
                        last_scores = json.loads(score_segment)
                    except (json.JSONDecodeError, IndexError):
                        last_scores = None

            if (
                last_scores == raw_scores
                and last_line
                and last_line.rstrip().endswith(']')
            ):
                # Update the last line to include the timestamp instead of appending a duplicate entry.
                for idx in range(len(lines) - 1, -1, -1):
                    if lines[idx].strip():
                        lines[idx] = line_to_write + '\n'
                        break
                else:
                    lines.append(line_to_write + '\n')
                with open(OTHER_RESULTS_PATH, 'w', encoding='utf-8') as results_file:
                    results_file.writelines(lines)
            elif last_line != line_to_write:
                with open(OTHER_RESULTS_PATH, 'a', encoding='utf-8') as results_file:
                    needs_newline = (
                        os.path.exists(OTHER_RESULTS_PATH)
                        and os.path.getsize(OTHER_RESULTS_PATH) > 0
                        and last_line is not None
                    )
                    if needs_newline:
                        results_file.write('\n')
                    results_file.write(line_to_write)
            else:
                print("Skipped writing duplicate AI prediction scores entry.")
        except Exception as file_err:
            print(f"Failed to write other_results.txt: {file_err}")

        # --- หาผลลัพธ์ ---
        predicted_index = np.argmax(prediction)
        confidence = float(prediction[predicted_index])
        class_label = CLASS_LABELS[predicted_index]

        # --- ส่งผลลัพธ์กลับ ---
        return jsonify({
            'success': True,
            'predicted_index': int(predicted_index),
            'class_label': class_label,
            'confidence': confidence,
            'scores': raw_scores,
            'timestamp': timestamp
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Python Model Server is starting on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000)