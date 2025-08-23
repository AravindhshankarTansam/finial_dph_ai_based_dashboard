import cv2
import numpy as np

def preprocess(image_array, resize_dim=(128, 128)):
    if image_array is None or image_array.size == 0:
        raise ValueError("Empty image array passed to preprocess()")

    height, width = image_array.shape[:2]
    roi = image_array[int(height * 0.1):int(height * 0.9), int(width * 0.25):int(width * 0.75)]
    roi = cv2.resize(roi, resize_dim)

    lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)

    return cv2.merge((l, a, b))
