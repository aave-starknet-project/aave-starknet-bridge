git clone git@github.com:trailofbits/amarna.git
cd amarna
pip install -e .
cd ..
.venv/bin/amarna contracts -o out_cairo.sarif -summary
