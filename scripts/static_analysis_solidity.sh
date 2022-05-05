.venv/bin/slither . --exclude-low --exclude-medium --exclude-dependencies --exclude-optimization --sarif vulnerabilities/results_solidity.sarif

if [ $? > 0 ]
then
	exit 0
else
	exit -1
fi
