# Label definitions - OpenCV sample image corpus (samples/data)

Source: https://github.com/opencv/opencv/tree/4.x/samples/data
Licence: Apache-2.0 (https://github.com/opencv/opencv/blob/4.x/LICENSE)
Transcribed: 2026-10-27T10:24:42Z

**Transcribed verbatim from the source assessment manifest.** These definitions
were recorded during rights assessment. Nothing below was inferred, relabelled
or extended by this pipeline.

- NO classification labels ship with this corpus. Nothing below is a category label.
- VERIFIED by reading the preserved files (transcribed, not inferred):
-   - stereo_calib.xml: an <imagelist> pairing left01.jpg<->right01.jpg ... left14.jpg<->right04.jpg. This is ground truth establishing that the left*/right* files are STEREO PAIRS of the same calibration board, i.e. distinct samples, NOT duplicates of one another.
-   - calibration.yml, intrinsics.yml, left_intrinsics.yml: camera intrinsic matrices for the calibration set.
-   - H1to3p.xml: a 3x3 homography matrix (ground truth for the pic1->pic3 view correspondence).
-   - essential_mat_data.txt: essential-matrix ground truth.
-   - aloeGT.png: disparity ground-truth MAP for aloeL.jpg/aloeR.jpg (an image, preserved in raw_images/, not a label file).
-   - letter-recognition.data: 20,000 rows, each a letter label (A-Z) plus 16 numeric features (the UCI Letter Recognition dataset). Tabular feature data - it does NOT label any image in this corpus and must not be joined to one.
-   - data01.xml: OpenCV FileNode training data for the ml sample.
-   - alphabet_36.txt / alphabet_94.txt: character sets for the text samples.
