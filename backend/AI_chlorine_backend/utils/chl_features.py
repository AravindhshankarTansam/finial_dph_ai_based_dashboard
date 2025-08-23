import cv2
import numpy as np
from skimage import feature
from scipy.stats import skew, kurtosis, entropy

def glcm_features(gray):
    glcm = feature.graycomatrix(gray, distances=[1], angles=[0], levels=256, symmetric=True, normed=True)
    return {
        "glcm_contrast": feature.graycoprops(glcm, 'contrast')[0, 0],
        "glcm_correlation": feature.graycoprops(glcm, 'correlation')[0, 0],
        "glcm_energy": feature.graycoprops(glcm, 'energy')[0, 0],
        "glcm_homogeneity": feature.graycoprops(glcm, 'homogeneity')[0, 0],
        "glcm_entropy": -np.sum(glcm * np.log2(glcm + 1e-10))
    }

def channel_stats(channel):
    flat = channel.flatten()
    return {
        "mean": np.mean(flat),
        "std": np.std(flat),
        "min": np.min(flat),
        "max": np.max(flat),
        "skew": skew(flat),
        "kurtosis": kurtosis(flat)
    }

def extract_features(image):
    if image is None or image.size == 0:
        raise ValueError("Empty image provided")

    l, a, b = cv2.split(image)
    gray = l  # Use L channel as grayscale

    # LAB stats
    stats_l = channel_stats(l)
    stats_a = channel_stats(a)
    stats_b = channel_stats(b)

    # Histogram on B-channel
    hist_b = cv2.calcHist([b], [0], None, [32], [0, 256])
    hist_b = cv2.normalize(hist_b, None).flatten()

    # GLCM features
    glcm_feats = glcm_features(gray)

    # Combine all features
    features = [
        *hist_b,
        *stats_l.values(),
        *stats_a.values(),
        *stats_b.values(),
        *glcm_feats.values()
    ]

    if np.isnan(features).any():
        raise ValueError("NaN in features")

    return np.array(features)
