if exist git/pre-push (
    cp git/pre-push ../.git/hooks/pre-push
	echo "Git hooks successfully configured!"
) else (
    echo "ERROR: SCRIPT MUST BE RUN FROM /dev-tools directory!"
)


