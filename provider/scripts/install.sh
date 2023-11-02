# If the editor and core files are missing, we download them from GitHub.
if [ ! -d "h5p/editor" ] || [ ! -d "h5p/core" ]
then    
    sh scripts/download-core.sh 1.24.4 1.25
else
    echo "Not downloading H5P Core and Editor files as they are already present!"
fi