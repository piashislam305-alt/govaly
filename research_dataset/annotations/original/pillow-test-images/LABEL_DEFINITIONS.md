# Label definitions - Pillow test image corpus (Tests/images)

Source: https://github.com/python-pillow/Pillow/tree/main/Tests/images
Licence: MIT-CMU (https://github.com/python-pillow/Pillow/blob/main/LICENSE)
Transcribed: 2026-10-27T10:24:44Z

**Transcribed verbatim from the source assessment manifest.** These definitions
were recorded during rights assessment. Nothing below was inferred, relabelled
or extended by this pipeline.

- NO classification labels ship with this corpus. Nothing below is a category label.
- VERIFIED by reading the preserved files (transcribed, not inferred):
-   - Tests/images/bmp/README.txt states verbatim: 'These images are from the bmpsuite: https://github.com/jsummers/bmpsuite and are in the public domain according to the readme in the project.' THIRD-PARTY PROVENANCE: the bmp/ subset originates from Jason Summers' bmpsuite and is asserted to be public domain by that upstream project. Attribution should cite bmpsuite alongside Pillow for those files.
-   - Tests/images/tga/common/readme.txt documents a STRUCTURED NAMING CONVENTION: {width}x{height}_{mode}_{origin}_{compression}.tga where mode is a PIL mode in lower case, origin is 'bl' (bottom-left) or 'tl' (top-left), and compression is 'raw' or 'rle'. Filenames in that directory are therefore parseable metadata - a real, non-invented source of attributes. Images created with GIMP.
