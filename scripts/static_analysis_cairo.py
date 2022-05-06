import subprocess

package_name = "amarna"

env_name = f".venv{package_name}"
process_args = {"check": True, "shell": True}

curr_env = subprocess.run("pip -V", capture_output=True, **process_args)

files = subprocess.run("ls -a", capture_output=True, **process_args)
if env_name in files.stdout.decode("utf-8"):
    subprocess.run(f"rm -rf {env_name}/bin/activate", **process_args)

subprocess.run(f"python -m venv {env_name}", **process_args)
subprocess.run("pip install git+https://github.com/crytic/amarna.git@main", **process_args)
subprocess.run("amarna contracts -o vulnerabilities/results_cairo.sarif", **process_args)