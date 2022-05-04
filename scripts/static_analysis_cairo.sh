# git clone git@github.com:trailofbits/amarna.git
# cd amarna
# pip install -e .
# cd ..
pip install https://github.com/crytic/amarna.git
.venv/bin/amarna contracts -o out_cairo.sarif -summary
