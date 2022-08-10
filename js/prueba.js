$(function(){

    var marInterval;
    var marquee;
    
    Handlebars.registerHelper('getDate', function(dateString) {
        var date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    });

    Handlebars.registerHelper('mostrarIMECA', function(stationId, imecasArray){
        var imeca;
        var mantenimiento = {
            legend: "En mantenimiento",
            class: "nrc",
            color: "#9D9D9D"
        };
        var intervals = {
            "50": {
                legend: "Buena",
                class: "b",
                color: "#97CA03"
            },
            "100": {
                legend: "Regular",
                class: "r",
                color: "#FFFF19"
            },
            "150": {
                legend: "Mala",
                class: "m",
                color: "#FF9E19"
            },
            "200": {
                legend: "Muy Mala",
                class: "mm",
                color: "#FF1919"
            },
            "300": {
                legend: "Extremadamente Mala",
                class: "em",
                color: "#9E359E"
            },
            "500": {
                legend: "Peligrosa",
                class: "p",
                color: "#7E0023"
            }
        };

        for(var i = 0; i < imecasArray.length; i++){
            if(imecasArray[i]["id"] == stationId){
                imeca = imecasArray[i];
                break;
            } 
        }

        var keys = Object.keys(imeca);
        var li = "";
        var empty = true;

        for(var i = 1; i < keys.length; i += 2 ){
            if(imeca[keys[i]] !== ""){
                empty = false;
                break;
            }
        }
        
        if(!empty){
            for(var i = 1; i < keys.length; i+=2 ){
                var value = imeca[keys[i]];
                var intervalValue = getInterval(value);
                var legend, clase, color;
                if(intervalValue != "") {
                    legend = intervals[intervalValue]["legend"];
                    clase = intervals[intervalValue]["class"];
                    color = intervals[intervalValue]["color"];
                } else {
                    legend = mantenimiento["legend"];
                    clase = mantenimiento["class"];
                    color = mantenimiento["color"];
                }
                li += "<li><span class='dot " + clase + "'></span><span class='mayusculas'>" + keys[i] + "</span>: <span class='dataValue'>" + imeca[keys[i]] + " (" + legend +  ")</span></li>";
            }
        } else {
            li += "<li>Estación en mantenimiento</li>";
        } 
        
        return new Handlebars.SafeString(li);
    });

    Handlebars.registerHelper('mostrarConcentracion', function(concentracionesArray){

        var li = "";
        var empty = true;

        for(var i = 0; i < concentracionesArray.length; i++){
            if(concentracionesArray[i]["value"] !== ""){
                empty = false;
                break;
            }
        }
        
        if(!empty){
            li += "<li>Hora de lectura: <span class='dataValue'>" + concentracionesArray[0]["time"].split("|")[1] + "</span></li>";
            for(var i = 0; i < concentracionesArray.length; i++){
                if(concentracionesArray[i]["value"] !== "")
                    li += "<li><span class='mayusculas'>" + concentracionesArray[i]["pollutant"] + "</span>: <span class='dataValue'>" + concentracionesArray[i]["value"] + " " + concentracionesArray[i]["unit"] + "</span></li>";
            }
        } else {
            li += "<li>Estación en mantenimiento</li>";
        } 
        
        return new Handlebars.SafeString(li);
    });

    Handlebars.registerHelper('getToday', function () {
        var meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
        var today = new Date();
        var month = today.getMonth();
        return today.getDate() + " de " + meses[month] + " del " + today.getFullYear();
    });
    Handlebars.registerHelper('getHours', function () {
        var today = new Date();
        return today.getHours() + " horas";
    });
    Handlebars.registerHelper('getTime', function (v1) {
        var dateArray = v1.split("|");
        return dateArray[1] + " horas";
    });

    function getInterval(value) {
        if(value <= 50) return "50";
        else if(value <= 100) return "100";
        else if(value <= 150) return "150";
        else if(value <= 200) return "200";
        else if(value <= 300) return "300";
        else if(value <= 500) return "500";
        else return "";
    }

    $("#sedema-container h3").on("click", function(){
        if((map.getLayer("sedemaConcentracion") && map.getLayer("sedemaConcentracion").visible) || (map.getLayer("sedemaIMECA") && map.getLayer("sedemaIMECA").visible)) {
            map.getLayer("sedemaConcentracion").hide();
            map.getLayer("sedemaIMECA").hide();

            $("footer").css("display", "none");
            clearInterval(marInterval);
        } else {
            map.getLayer("sedemaConcentracion").show();
            map.getLayer("sedemaIMECA").show();
            getStationsInformation();
        }
    });

    function getStationsInformation() {
        var params = {};
        $.ajax({
            url: "./sedema.php",
            data: params,
            method: "GET",
            dataType: "text",
            success: function(data){
                var airCondition = JSON.parse(data);
                // console.log(airCondition["airdata"]);
                if(airCondition["airdata"]){
                    map.getLayer("sedemaConcentracion").clear();
                    map.getLayer("sedemaIMECA").clear();

                    var megalopolisTemplate = $("#megalopolis-template").html();
                    var template = Handlebars.compile(megalopolisTemplate);
                    var html = template(airCondition["airdata"]["information"][0]);
                    $('#megalopolis').html(html);

                    var estacionesTemplate = $("#estaciones-template").html();
                    var templateStat = Handlebars.compile(estacionesTemplate);
                    var htmlStat = templateStat(airCondition["airdata"]);
                    $('#estaciones').html(htmlStat);

                    $(".stationName").on("click", function(e){
                        var lat = $(this).attr("data-lat");
                        var lon = $(this).attr("data-lon");
                        var point = new esri.geometry.Point(lon, lat);
                        map.centerAndZoom(point, 14);
                    });

                    $(".seleccion div").on("click", function(){
                        $(".seleccion div").removeClass("active");
                        $(this).addClass("active");

                        if($(this).attr("id") === "imeca"){
                            $(".imecas").addClass("active");
                            $(".contaminantes").removeClass("active");
                        } else {
                            $(".contaminantes").addClass("active");
                            $(".imecas").removeClass("active");
                        }
                    });

                    if(airCondition["airdata"]["information"][0]["pcaa"] !== ""){
                        $("footer").css("display", "flex");
                        $("footer").css("justify-content", "flex-end");
                        $("#huracanInfo").text(airCondition["airdata"]["information"][0]["pcaa"]);

                        clearInterval(marInterval);
                        marquee = $('div.marquee');
                        marquee.each(function() {
                            var mar = $(this), indent = mar.width();
                            mar.marquee = function() {
                                indent--;
                                mar.css('text-indent',indent);
                                if (indent < -1 * mar.children('div.marquee-text').width()) {
                                    indent = mar.width();
                                }
                            };
                            mar.data('interval', marInterval = setInterval(mar.marquee,1000/60));
                        });
                    } else {
                        $("footer").css("display", "none");
                        clearInterval(marInterval);
                    }

                    require([
                        "esri/symbols/SimpleLineSymbol",
                        "esri/symbols/SimpleMarkerSymbol",
                        "esri/symbols/SimpleFillSymbol",
                        "esri/symbols/PictureMarkerSymbol",
                        "esri/geometry/Point",
                        "esri/graphic",
                        "esri/Color",
                        "esri/InfoTemplate",
                        "esri/graphicsUtils"
                    ], function(
                        SimpleLineSymbol,
                        SimpleMarkerSymbol,
                        SimpleFillSymbol,
                        PictureMarkerSymbol,
                        Point,
                        Graphic,
                        Color,
                        InfoTemplate,
                        graphicsUtils
                    ){
                        airCondition["airdata"]["stations"]["station"].forEach(function(station){
                            var point = new Point(station["location"]["lon"], station["location"]["lat"]);

                            var empty = true;

                            for(var i = 0; i < station["measurements"]["measurement"].length; i++){
                                if(station["measurements"]["measurement"][i]["value"] !== ""){
                                    empty = false;
                                    break;
                                }
                            }

                            var concentracionContent = "<div><h3 style='margin-bottom:0;'>Contaminantes</h3><h5 style='margin-top:0;'>Datos de concentración</h5><ul>";
                            
                            if(!empty){
                                concentracionContent += "<li>Hora de lectura: <span class='dataValue'>" + station["measurements"]["measurement"][0]["time"].split("|")[1] + "</span></li>";
                                for(var i = 0; i < station["measurements"]["measurement"].length; i++){
                                    if(station["measurements"]["measurement"][i]["value"] !== "")
                                        concentracionContent += "<li><span class='mayusculas'>" + station["measurements"]["measurement"][i]["pollutant"] + "</span>: <span class='dataValue'>" + station["measurements"]["measurement"][i]["value"] + " " + station["measurements"]["measurement"][i]["unit"] + "</span></li>";
                                }
                            } else {
                                concentracionContent += "<li>Estación en mantenimiento</li>";
                            } 
                            
                            concentracionContent += "</ul></div>";
                            var imecaContent = "<div><h3 style='margin-bottom:0;'>IMECA</h3><h5 style='margin-top:0;'>Valores por contaminante</h5><ul>";

                            var imeca;
                            var mantenimiento = {
                                legend: "En mantenimiento",
                                class: "nrc",
                                color: "#9D9D9D"
                            };
                            var intervals = {
                                "50": {
                                    legend: "Buena",
                                    class: "b",
                                    color: "#97CA03"
                                },
                                "100": {
                                    legend: "Regular",
                                    class: "r",
                                    color: "#FFFF19"
                                },
                                "150": {
                                    legend: "Mala",
                                    class: "m",
                                    color: "#FF9E19"
                                },
                                "200": {
                                    legend: "Muy Mala",
                                    class: "mm",
                                    color: "#FF1919"
                                },
                                "300": {
                                    legend: "Extremadamente Mala",
                                    class: "em",
                                    color: "#9E359E"
                                },
                                "500": {
                                    legend: "Peligrosa",
                                    class: "p",
                                    color: "#7E0023"
                                }
                            };

                            for(var i = 0; i < airCondition["airdata"]["imeca"]["imecas"].length; i++){
                                if(airCondition["airdata"]["imeca"]["imecas"][i]["id"] == station["id"]){
                                    imeca = airCondition["airdata"]["imeca"]["imecas"][i];
                                    break;
                                } 
                            }

                            var keys = Object.keys(imeca);
                            empty = true;

                            for(var i = 1; i < keys.length; i += 2 ){
                                if(imeca[keys[i]] !== ""){
                                    empty = false;
                                    break;
                                }
                            }

                            var stationMarker;
                            if(!empty){
                                var maxValuePosition = 0;
                                var maxValue = 0;
                                for(var i = 1; i < keys.length; i+=2){
                                    var value = imeca[keys[i]];
                                    var intervalValue = getInterval(value);
                                    var legend, clase, color;
                                    if(intervalValue != "") {
                                        legend = intervals[intervalValue]["legend"];
                                        clase = intervals[intervalValue]["class"];
                                        color = intervals[intervalValue]["color"];
                                    } else {
                                        legend = mantenimiento["legend"];
                                        clase = mantenimiento["class"];
                                        color = mantenimiento["color"];
                                    }
                                    imecaContent += "<li><span class='dot " + clase + "'></span><span class='mayusculas'>" + keys[i] + "</span>: <span class='dataValue'>" + imeca[keys[i]] + " (" + legend +  ")</span></li>";
                                    if(parseInt(imeca[keys[i]]) >= parseInt(maxValue)) {
                                        maxValue = parseInt(imeca[keys[i]]);
                                        maxValuePosition = i;
                                    }
                                }
                                var maxValue = getInterval(imeca[keys[maxValuePosition]]);
                                stationMarker = new PictureMarkerSymbol('imagenes/SEDEMA/' + intervals[maxValue]["class"] + '.png', 25, 25);
                            } else {
                                imecaContent += "<li>Estación en mantenimiento</li>";
                                stationMarker = new PictureMarkerSymbol('imagenes/SEDEMA/mantenimiento.png', 25, 25);
                            }

                            imecaContent += "</ul></div>";
                            var airConditionConcentracion = {title: "Estación: " + station.name, content: concentracionContent};
                            var airConditionIMECA = {title: "Estación: " + station.name, content: imecaContent};

                            var graphicConcentracion = new Graphic(point, new PictureMarkerSymbol('imagenes/SEDEMA/pin.png', 25, 25), null, new InfoTemplate(airConditionConcentracion));
                            var graphicIMECA = new Graphic(point, stationMarker, null, new InfoTemplate(airConditionIMECA));

                            map.getLayer("sedemaConcentracion").add(graphicConcentracion);
                            map.getLayer("sedemaIMECA").add(graphicIMECA);
                        });

                        map.setExtent(graphicsUtils.graphicsExtent(map.getLayer("sedemaIMECA").graphics).expand(1.8));
                        map.getLayer("sedemaConcentracion").hide();

                        $(".seleccion div").on("click", function(){
                            if($(this).attr("id") === "imeca"){
                                if(map.getLayer("sedemaConcentracion")) map.getLayer("sedemaConcentracion").hide();
                                if(map.getLayer("sedemaIMECA")) map.getLayer("sedemaIMECA").show();
                            } else {
                                if(map.getLayer("sedemaConcentracion")) map.getLayer("sedemaConcentracion").show();
                                if(map.getLayer("sedemaIMECA")) map.getLayer("sedemaIMECA").hide();
                            }
                        });
                    });
                } else {
                    
                }
            },
            error: function(error){
                console.log("Error", error);
            }
        });
    }
})
