# https://api.jquery.com/jQuery.param/
# AJAX POST calls in jQuery 3+ serialize arrays in a way that it's not supported by current H5P endpoints (H5PAjaxEndpoint).
# Setting "traditional" to TRUE in every ajax call done by the editor should fix it.
# If in the future, backed enpoints or frontend libraries change, maybe this will be no longer needed.

FILE="h5p/core/js/jquery.js"
if [ -f "$FILE" ]; then
echo "Patching $FILE"

echo "
H5P.jQuery.ajaxSetup({
  traditional: true
});" >> $FILE
fi
