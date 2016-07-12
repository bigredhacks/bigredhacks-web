#!/bin/bash
if [ -a ./git/pre-push ]
then
	cp ./git/pre-push ../.git/hooks/pre-push
	echo "Git hooks successfully configured!"
else
	echo "ERROR: SCRIPT MUST BE RUN FROM /dev-tools directory!"
fi

