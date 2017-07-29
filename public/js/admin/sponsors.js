function setDownloads(input){
    $("#contactInfo").click(function(){
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += decodeURI(input);

        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "bigredhacksParticipantInfo" + (new Date().getFullYear()) + ".csv");
        document.body.appendChild(link); // Required for FF
        link.click(); // This will download the data file named "my_data.csv".
    });
}
