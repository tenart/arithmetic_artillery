$(function() {

    // Global var declarations

    var name;
    var gameID;
    var board = "big";
    var gameTree;
    var myPlayer;

    var database = firebase.database();

    var heading;
    var equation;
    var result;

    var turn = 1;
    var mode = "standby";

    var player1 = {
        x: 1,
        y: 1,
        direction: "E",
        health: 100
    }

    var player2 = {
        x: 14,
        y: 14,
        direction: "W",
        health: 100
    }

    var cursor = {
        x: 0,
        y: 0,
        down: false
    }

    var gunshotSFX = new Howl({
        src: ["sound/gunshot.mp3"],
        volume: 0.7
    })

    var whistleSFX = new Howl({
        src: ["sound/whistle.mp3"],
        volume: 0.6
    })

    var splashSFX = new Howl({
        src: ["sound/splash.mp3"],
    })

    $(".flash_img").hide();

    $(document).mousedown(function() {
        cursor.down = true;
    })

    $(document).mouseup(function() {
        cursor.down = false;
    })

    $(".size").click(function() {
        $(".size").removeClass("active");
        $(this).addClass("active");
        board = $(this).attr("id");
    })

    $("#create button").click(function() {
        if( $("#name").val().length < 1 ) {
            $("#name").addClass("attn");
        } else {
            name = $("#name").val().toString();
            $("#name").removeClass("attn");
        }
    })

    $("#create input").blur(function() {
        if( $(this).val().length > 0 ) {
            $(this).removeClass("attn");
        }
    })

    $("#create_game").click(function() {
        if( $("#createID").val().length < 1 ) {
            $("#createID").addClass("attn");
        } else if( $("#name").val().length > 1 ) {
            gameID = $("#createID").val().toString().toLowerCase().trim();
            $("#createID").removeClass("attn");

            // Retrieve data tree with the Session ID name and if it is unique create new session
            return database.ref("/" + gameID).once('value').then(function(snapshot) {
                gameTree = snapshot.val();
                if ( gameTree == null ) {
                    database.ref("/" + gameID).update(
                        {
                            "player1": {
                                "direction": "E",
                                "equation": "",
                                "health": 100,
                                "name": name,
                                "result": "",
                                "x": 1,
                                "y": 1
                            },
                            "player2": {
                                "direction": "W",
                                "equation": "",
                                "health": 100,
                                "name": "",
                                "result": "",
                                "x": 14,
                                "y": 14
                            },
                            "shot": {
                                x: 0,
                                y: 0
                            },
                            "size": board,
                            "turn": 1
                        }
                    )

                    myPlayer = 1;
                    transitionGame();
                    mode = "move";
                    heading = "E";
                    $("#E").addClass("sel");

                } else {
                    alert("A session with this ID already exists, try searching for it and join it that way.");
                }
            });
        }
    })

    $("#findID").change(function() {
        $("#find_game").text("FIND GAME").removeClass("attn");
    });

    $("#find_game").click(function() {
        if( $(this).text() != "JOIN GAME" ) {
            if( $("#findID").val().length < 1 ) {
                $("#findID").addClass("attn");
            } else if( $("#name").val().length > 1 ) {
                gameID = $("#findID").val().toString().toLowerCase().trim();
                $("#findID").removeClass("attn");

                // Retrieve data tree with the Session ID name and if it exists, displays the information
                return database.ref("/" + gameID).once('value').then(function(snapshot) {
                    gameTree = snapshot.val();
                    if( gameTree != null ) {

                        if( gameTree.player2.name == "") {
                            $("#result_name").text(gameTree.player1.name);
                            $("#find_game").text("JOIN GAME").addClass("attn");
                            if( gameTree.size == "small" ) {
                                $("#result_size").text("8 × 8");
                            } else {
                                $("#result_size").text("16 × 16");
                            }
                        } else {
                            $("#result_name").text("Game Full");
                            $("#result_size").text("×");
                        }

                    } else {
                        $("#result_name").text("No Result");
                        $("#result_size").text("×");
                    }
                });

            }
        } else {
            database.ref("/" + gameID + "/player2").update( { "name": name } )
            myPlayer = 2;
            transitionGame();
            mode = "standby";
            heading = "W";
            $("#W").addClass("sel");
        }
    })

    function transitionGame() {
        $("#welcome").hide()
        $("#game_board").show()
        return database.ref("/" + gameID).once('value').then(function(snapshot) {
            gameTree = snapshot.val();

            $("#name1 h2").text(gameTree.player1.name.toUpperCase());

            $("#name2 h2").text(gameTree.player2.name.toUpperCase());

            database.ref("/" + gameID + "/player2/name").on('value', function(snapshot) {
                $("#name2 h2").text(snapshot.val().toUpperCase());
                if( myPlayer == 1 ) {
                    mode = "move";
                }
            })

            database.ref("/" + gameID + "/turn").on('value', function(snapshot) {
                turn = snapshot.val();
            })

            database.ref("/" + gameID + "/shot").on('value', function(snapshot) {
                target = snapshot.val();
                if( turn == 1 ) {
                    animateShell(player1, target);
                } else {
                    animateShell(player2, target);
                }
            })

            database.ref("/" + gameID + "/player2/equation").on('value', function(snapshot) {
                if( myPlayer == 2 ) {
                    mode = "standby";
                } else {
                    mode = "shoot";
                }
            })

            database.ref("/" + gameID + "/player1/equation").on('value', function(snapshot) {
                if( myPlayer == 1 ) {
                    mode = "standby";
                } else {
                    mode = "shoot";
                }
            })

            database.ref("/" + gameID + "/player2").on('value', function(snapshot) {

                var dbPlayer2 = snapshot.val();

                player2.health = dbPlayer2.health;

                if( myPlayer == 2 ) {

                    player2.x = dbPlayer2.x;
                    player2.y = dbPlayer2.y;

                    mode = "standby";

                } else {

                    $("#enemyeq").text( dbPlayer2.equation );
                    $("#enemydir").text( dbPlayer2.direction.toUpperCase() );
                    player2.direction = dbPlayer2.direction.toUpperCase();

                    // Player1 SHOOTING
                    $("#grid td").click(function() {
                        if( turn == myPlayer && mode == "shoot") {

                            player2.x = dbPlayer2.x;
                            player2.y = dbPlayer2.y;

                            database.ref("/" + gameID + "/shot").update( {
                                x: cursor.x,
                                y: cursor.y
                            });

                            if( cursor.x == dbPlayer2.x && cursor.y == dbPlayer2.y ) {
                                setTimeout(function() {

                                    player2.health = player2.health - 10;

                                    database.ref("/" + gameID + "/player2").update( {
                                        "health": player2.health,
                                    });

                                }, 1000);
                            }

                            setTimeout(function() {
                                mode = "move"
                            }, 100);
                        }
                    })
                }
            })

            database.ref("/" + gameID + "/player1").on('value', function(snapshot) {

                var dbPlayer1 = snapshot.val();

                player1.health = dbPlayer1.health;

                if( myPlayer == 1 ) {

                    player1.x = dbPlayer1.x;
                    player1.y = dbPlayer1.y;

                    mode = "standby";

                } else {

                    $("#enemyeq").text( dbPlayer1.equation );
                    $("#enemydir").text( dbPlayer1.direction.toUpperCase() );
                    player1.direction = dbPlayer1.direction.toUpperCase();

                    // Player2 SHOOTING
                    $("#grid td").click(function() {
                        if( turn == myPlayer && mode == "shoot") {

                            player1.x = dbPlayer1.x;
                            player1.y = dbPlayer1.y;

                            database.ref("/" + gameID + "/shot").update( {
                                x: cursor.x,
                                y: cursor.y
                            });

                            if( cursor.x == dbPlayer1.x && cursor.y == dbPlayer1.y ) {
                                setTimeout(function() {

                                    player1.health = player1.health - 10;

                                    database.ref("/" + gameID + "/player1").update( {
                                        "health": player1.health,
                                    });

                                }, 1000);
                            }

                            setTimeout(function() {
                                mode = "move"
                            }, 100);

                        }
                    })

                }


            })

        })

    }

    $("#boatbox1").draggable();

    // Converts pixel coordinates to block coordinates specifically for Rameses (50x50)
    function pxToBlock(px) {
        if(rameses.direction == "E" || rameses.direction == "S") {
            return Math.ceil(px/30);
        } else {
            return Math.floor(px/30);
        }
    }

    // Converts pixel coordinatess to block coordinates using Math.floor()
    function pxToBlockFloor(px) {
        return Math.floor(px/30);
    }

    // Converts block coordinates to pixel coordinates
    function blockToPx(block) {
        return block*30;
    }

    $("#grid td").mouseenter(function() {
        cursor.x = parseInt($(this).index());
        cursor.y = parseInt($(this).parent().index());
    })

    var target = {
        x: 0,
        y: 0
    }

    var shellTest = false;
    $("#grid td").click(function() {
        if(shellTest) {
            animateShell(player2, cursor);
        }
    })

    function animateShell(from, to) {
        var shell = $("#shell");
        var shellSprite = $("#shell_sprite");
        var flash = $("#flash");
        var angleDeg = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
        gunshotSFX.play();
        whistleSFX.play();
        gunFlash(from, angleDeg);
        tracer(from, to, angleDeg);
        splash(to);
        shell.css("top", blockToPx(from.y))
            .css("left", blockToPx(from.x))
            .css("transform", "rotate(" + angleDeg + "deg)");
        shell.show();
        shell.animate({
            top: blockToPx(to.y),
            left: blockToPx(to.x)
        }, 1000, "linear", function() {
            shell.hide();
            //shell.css("top", blockToPx(from.y))
            //    .css("left", blockToPx(from.x));
            shellSprite.css("transform", "translateZ(10px) rotateY(-30deg) translateX(10px)");

            splashSFX.play();
        })

        shellSprite.css("transform", "translateZ(100px) rotateY(0deg) translateX(10px)").css("transition-timing-function", "ease-out");

        // Dummy animation just to use the 500 ms delay
        shellSprite.animate({
            left: 0,
        }, 500, "linear",function() {
            shellSprite.css("transition-timing-function", "ease-in")
                .css("transform", "translateZ(10px) rotateY(30deg) translateX(10px)");
        })
    }

    function tracer(from, to, angle) {
        var tracer = $("#tracer");
        var tracerSprite = $("#tracer_sprite");
        var midpoint = {
            x: (from.x + to.x)/2,
            y: (from.y + to.y)/2
        }
        var distance = Math.sqrt( Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2) );
        var left = (blockToPx(distance/2)-15);
        tracer.css("left", blockToPx(midpoint.x));
        tracer.css("top", blockToPx(midpoint.y));
        tracer.css("width", blockToPx(distance));
        tracer.css("margin-left", left*-1);
        tracer.css("transform", "rotateX(-90deg) translateY(-75px) rotateY(" + -1*angle + "deg)")
        tracer.show();
        tracerSprite.css("transition", "width 1s linear");
        tracerSprite.css("background-size", blockToPx(distance) + "px 150px");
        tracerSprite.css("width", "100%");
        tracer.animate({
            background: "transparent",
        }, 500, function() {
            tracer.fadeOut(1000);
        });
        tracerSprite.animate({
            background: "transparent",
        }, 1500, function() {
            tracerSprite.css("transition", "width 0s linear");
            tracerSprite.css("width", "0%");
        });
    }

    function gunFlash(position, angle) {
        var flash = $("#flash");
        var flashSprite = $("#flash_sprite");
        flash.css("left", blockToPx(position.x)).css("top", blockToPx(position.y));
        $(".flash_img").show();
        flash.css("transform", "rotate(" + angle + "deg)");
        flashSprite.css("transform", "translateZ(10px) rotateY(-20deg) scale3d(1.5,1.5,1.5) translateX(30px)");
        flashSprite.animate({
            left: 0,
        }, 100, function() {
            flashSprite.css("transform", "translateZ(20px) translateX(30px) rotateY(-20deg) scale3d(0.5,0.5,0.5) translateX(30px)");

        })
        flashSprite.animate({
            left: 0,
        }, 100, function() {
            flashSprite.hide();
            flashSprite.css("transform", "translateZ(10px) rotateY(-20deg) scale3d(0.5,0.5,0.5) translateX(30px)");
        })
    }


    function splash(position) {
        splash2(position);
        var splash = $("#splash");
        var splashSecondary = $("#splash2");
        splash.hide().css("left", blockToPx(position.x))
            .css("top", blockToPx(position.y))
            .css("transform", "scale(1)")
            .css("opacity", 1);
        splashSecondary.hide().css("left", blockToPx(position.x))
            .css("top", blockToPx(position.y))
            .css("transform", "scale(0.5)")
            .css("opacity", 1);
        splash.animate({
            border: 0,
        }, 1000, function() {
            splash.show().css("transform", "scale(2.5)")
                .css("opacity", 0);
            splashSecondary.show().css("transform", "scale(2.5)")
                .css("opacity", 0);
        });
    }

    function splash2(position) {
        var splash = $("#splash_vert");
        var splash2 = $("#splash_vert2")
        splash.hide().css("left", blockToPx(position.x))
            .css("top", blockToPx(position.y))
            .css("transform", "scaleZ(4) rotateX(-90deg)")
            .css("opacity", 1);

        splash2.hide().css("left", blockToPx(position.x))
            .css("top", blockToPx(position.y))
            .css("transform", "scaleZ(4.5) rotateX(-90deg)  rotateY(90deg)")
            .css("opacity", 1);

        splash.animate({
            border: 0,
        }, 1000, function() {
            splash.show().css("transform", "scaleZ(1) rotateX(-90deg)")
                .css("opacity", 0);
            splash2.show().css("transform", "scaleZ(1) rotateX(-90deg) rotateY(90deg)")
                .css("opacity", 0);
        });
    }

    $("#heading_container button").click(function() {
        $("#heading_container button").removeClass("sel");
        $(this).addClass("sel");
        heading = $(this).attr("id").toUpperCase();
        if( myPlayer == 1 ) {
            player1.direction = heading;
        } else {
            player2.direction = heading;
        }
    });

    $("#submit").click(function() {
        if( $("#result").val().length > 0 && $("#result").val() != "NaN" && turn == myPlayer && mode == "move" ) {


            return database.ref("/" + gameID).once('value').then(function(snapshot) {

                gameTree = snapshot.val();

                var lastEq;
                if( myPlayer == 1 ) {
                    lastEq = gameTree.player1.equation;
                } else {
                    lastEq = gameTree.player2.equation;
                }

                var newX;
                var newY;

                if( equation != lastEq ) {

                    if( myPlayer==1 ) {

                        if(heading == "N") {
                            newY = player1.y - result;
                            newX = player1.x;
                        }
                        if(heading == "S") {
                            newY = player1.y - result*-1;
                            newX = player1.x;
                        }
                        if(heading == "E") {
                            newX = player1.x - result*-1;
                            newY = player1.y;
                        }
                        if(heading == "W") {
                            newX = player1.x - result;
                            newY = player1.y;
                        }

                        if( newX > 15) {
                            newX = 15;
                        } else if( newX < 0) {
                            newX = 0;
                        }

                        if( newY > 15) {
                            newY = 15;
                        } else if( newY < 0) {
                            newY = 0;
                        }

                        database.ref("/" + gameID).update( { "turn": 2 } );

                        database.ref("/" + gameID + "/player1").update( {
                            "direction": heading,
                            "equation": equation,
                            "result": result,
                            "x": newX,
                            "y": newY
                        });

                    } else {

                        if(heading == "N") {
                            newY = player2.y - result;
                            newX = player2.x;
                        }
                        if(heading == "S") {
                            newY = player2.y - result*-1;
                            newX = player2.x;
                        }
                        if(heading == "E") {
                            newX = player2.x - result*-1;
                            newY = player2.y;
                        }
                        if(heading == "W") {
                            newX = player2.x - result;
                            newY = player2.y;
                        }

                        if( newX > 15) {
                            newX = 15;
                        } else if( newX < 0) {
                            newX = 0;
                        }

                        if( newY > 15) {
                            newY = 15;
                        } else if( newY < 0) {
                            newY = 0;
                        }

                        database.ref("/" + gameID).update( { "turn": 1 } );

                        database.ref("/" + gameID + "/player2").update( {
                            "direction": heading,
                            "equation": equation,
                            "health": player2.health,
                            "result": result,
                            "x": newX,
                            "y": newY
                        });
                    }

                    $("#equation").val("");
                    $("#result").val("");

                } else {
                    alert("Equation cannot be the same as the last submitted!");
                }
            });



        }
    })

    $("#debug").draggable({
        scroll: false,
        containment: "body"
    });

    var orbit = {
        x: 0,
        y: 0,
        xdir: "",
        ydir: "",
        hdeg: 45,
        vdeg: 55,
        hspeed: 0,
        vspeed: 0
    }

    $("#board").mousemove(function(e) {

        var relX = e.pageX;
        var relY = e.pageY;

        if( relX > orbit.x ) {
            orbit.xdir = "-";
        } else if( relX < orbit.x ){
            orbit.xdir = "+";
        } else {
            orbit.xdir = "";
        }

        if( relY > orbit.y ) {
            orbit.ydir = "-";
        } else if( relY < orbit.y ){
            orbit.ydir = "+";
        } else {
            orbit.ydir = "";
        }

        orbit.hspeed = Math.abs(relX - orbit.x);
        orbit.vspeed = Math.abs(relY - orbit.y);

        orbit.x = relX;
        orbit.y = relY;
        //$("#orbx").text("X: " + relX);
        //$("#orby").text("Y: " + relY);
    })

    $("#board").mouseleave(function() {
        orbit.hspeed = 0;
        orbit.vspeed = 0;
    })

    setInterval(update, 33.33);

    function update() {

        if( !cursor.down ) {
            orbit.xdir = "";
            orbit.ydir = "";
            orbit.hspeed = 0;
            orbit.vspeed = 0;
        }

        if( cursor.down ) {
            if( orbit.xdir == "+" ) {
                orbit.hdeg += orbit.hspeed;
            } else if( orbit.xdir == "-" ) {
                orbit.hdeg -= orbit.hspeed;
            }

            if( orbit.ydir == "+" ) {
                orbit.vdeg += orbit.vspeed;
            } else if( orbit.ydir == "-" ) {
                orbit.vdeg -= orbit.vspeed;
            }
        }

        if( orbit.vdeg > 80) {
            orbit.vdeg = 80;
        } else if( orbit.vdeg < 0 ) {
            orbit.vdeg = 0;
        }

        $("#board").css("transform", "rotateX(" + orbit.vdeg + "deg) rotateZ(" + orbit.hdeg + "deg)");

        if( !cursor.down ) {
            $("#reticule").css("left", blockToPx(cursor.x));
            $("#reticule").css("top", blockToPx(cursor.y));
        }
        $("#target_spline").css("transform",
            "rotateX(90deg) rotateY(" + orbit.hdeg*-1 + "deg) translateY(50px)"
        )
        $("#target_info").css("transform",
            "rotateX(90deg) rotateY(" + (orbit.hdeg + 180)*-1 + "deg) rotateZ(180deg) translateY(-100px)"
        )
        $("#target_x").text("x: " + cursor.x);
        $("#target_y").text("y: " + cursor.y);


        //transform: rotateX(55deg) rotateZ(45deg);

        /*
        $("#vertical").change(function() {
            $("#board").css("transform", "rotateX(" + $("#vertical").val() + "deg) rotateZ(" + $("#horizontal").val() + "deg)");
        })

        $("#horizontal").change(function() {
            $("#board").css("transform", "rotateX(" + $("#vertical").val() + "deg) rotateZ(" + $("#horizontal").val() + "deg)");
        })
        */

        //$("#board").css("transform", "rotateX(" + $("#vertical").val() + "deg) rotateZ(" + $("#horizontal").val() + "deg)");

        $("#heading_container").css("transform", "rotateX(" + orbit.vdeg + "deg) rotateZ(" + orbit.hdeg + "deg)");

        $("#boat1").css("top", $("#boatbox1").css("top")).css("left", $("#boatbox1").css("left"));
        $("#boat2").css("top", $("#boatbox2").css("top")).css("left", $("#boatbox2").css("left"));

        equation = $("#equation").val();
        result = Math.round(math.eval( $("#equation").val() ));
        $("#result").val(result);

        if( mode == "standby" || mode == "shoot" ) {
            $("#equation").prop('disabled', true);
        } else {
            $("#equation").prop('disabled', false);
        }

        if( mode == "standby" ) {
            $("#mode_frame").css("transform", "rotate(40deg)");
        } else if( mode == "shoot" ) {
            $("#mode_frame").css("transform", "rotate(0deg)");
        } else if( mode == "move" ) {
            $("#mode_frame").css("transform", "rotate(-40deg)");
        }

        if( turn == 1 ) {
            $("#indicator1").show();
            $("#indicator2").hide();
        } else {
            $("#indicator2").show();
            $("#indicator1").hide();
        }

        $("#name1 .health_progress").css("width", player1.health + "%");
        $("#name2 .health_progress").css("width", player2.health + "%");

        $("#debug_cx").text("cursor x: " + cursor.x);
        $("#debug_cy").text("cursor y: " + cursor.y);
        $("#debug_md").text("mouse down: " + cursor.down);

        $("#debug_mode").text("mode: " + mode);
        $("#debug_1x").text("player1 x: " + player1.x);
        $("#debug_1y").text("player1 y: " + player1.y);
        $("#debug_1dir").text("player1 direction: " + player1.direction);


        $("#debug_2x").text("player2 x: " + player2.x);
        $("#debug_2y").text("player2 y: " + player2.y);
        $("#debug_2dir").text("player2 direction: " + player2.direction);


        if( $("#name2 h2").text().length < 1 ) {
            $("#name2 h2").text("WAITING FOR PLAYER 2");
        }

        if( $("#enemyeq").text().length < 1 ) {
            $("#enemyeq").text("-");
        }

        if( myPlayer == 1 ) {
            $("#name1 h2").css("color", "#ffd700");
            $("#name2 h2").css("color", "#fff");
            $("#ind_2").hide();
            $("#ind_1").show();
        } else {
            $("#name1 h2").css("color", "#fff");
            $("#name2 h2").css("color", "#ffd700");
            $("#ind_1").hide();
            $("#ind_2").show();
        }

        if( player1.health < 0) {
            player1.health = 0
        }

        if( player2.health < 0) {
            player2.health = 0
        }

        if( player1.x > 15) {
            player1.x = 15;
        } else if( player1.x < 0) {
            player1.x = 0;
        }

        if( player1.y > 15) {
            player1.y = 15;
        } else if( player1.y < 0) {
            player1.y = 0;
        }

        if( player2.x > 15) {
            player2.x = 15;
        } else if( player2.x < 0) {
            player2.x = 0;
        }

        if( player2.y > 15) {
            player2.y = 15;
        } else if( player2.y < 0) {
            player2.y = 0;
        }

        if( player2.direction == "N" ) {
            $("#boatbox2").css("transform", "rotate(-90deg)");
        } else if( player2.direction == "S" ) {
            $("#boatbox2").css("transform", "rotate(90deg)");
        } else if( player2.direction == "E" ) {
            $("#boatbox2").css("transform", "rotate(0deg)");
        } else if( player2.direction == "W" ) {
            $("#boatbox2").css("transform", "rotate(180deg)");
        }

        if( player1.direction == "N" ) {
            $("#boatbox1").css("transform", "rotate(-90deg)");
        } else if( player1.direction == "S" ) {
            $("#boatbox1").css("transform", "rotate(90deg)");
        } else if( player1.direction == "E" ) {
            $("#boatbox1").css("transform", "rotate(0deg)");
        } else if( player1.direction == "W" ) {
            $("#boatbox1").css("transform", "rotate(180deg)");
        }

        $("#boatbox1").css( "top", blockToPx( player1.y ) );
        $("#boatbox1").css( "left", blockToPx( player1.x ) );

        $("#boatbox2").css( "top", blockToPx( player2.y ) );
        $("#boatbox2").css( "left", blockToPx( player2.x ) );

    }

})
