# Derived annotations

_Generated 2026-10-27T10:24:44Z_

Everything in this directory was produced **by this pipeline**, not by the original
source authors. It is kept physically separate from `annotations/original/` so that
original ground truth can never be confused with generated output.

## Contents

- `human_review_queue.csv` - ambiguous cases flagged for a human decision.

## What is deliberately NOT here

No classification labels have been generated for any image. Neither approved source
ships class labels, and this pipeline does not invent them. Any label you need must
come from either (a) an annotation file preserved under `annotations/original/`, or
(b) a human or model annotator, recorded separately with its own provenance.
