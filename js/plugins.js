"use strict"

function Canvas() {

}


(function($) {


    Number.prototype.toHalf = function () {
        return Math.round(this) - 0.5;
    };

    Graff = {
        init: function (div, options) {
            this.settings = {
                width: 600,
                height: 300,
                minBrushSize: 3,
                maxBrushSize: 23,
                tHeight: 67,
                space: 20,
                fill: '#E4E4E4',
                stroke: '#BFBFBF'
            };

            this.brush = {
                size: 11.5, // px
                color: '150,150,150', // r,g,b
                opacity: 50 // %
            };

            var canvas = Canvas().init();

            this._toolCanvas = this.createBrushControls().init();
            this._mainCanvas = canvas;
            return this.appendMarkUp(div);
        },

        createMainCanvas: function() {
            var canvas = document.createElement('canvas'),
                helper = document.createElement('canvas');


            var glob = this,
                ctx = canvas.getContext('2d'),
                ctx2 = helper.getContext('2d'),
                path = [],
                down = false;

            canvas.width = helper.width = this.settings.width;
            canvas.height = helper.height = this.settings.height;
            return {
                canvas: canvas,
                init: function() {
                    var me = this,
                        move;

                    canvas.addEventListener( 'mousedown', function (e) {
                        var cords = glob.getCursorPosition(e);
                        path = [];
                        path.push(cords);
                        down = true;
                        ctx2.clearRect( 0, 0, helper.width, helper.height );
                        ctx2.drawImage( canvas, 0, 0 );
                        me.drawPath( path );

                        window.addEventListener( 'mousemove', move = function(e) {
                            if (!down ) return;
                            var cords = glob.getCursorPosition(e, canvas);

                                path.push(cords);
                                ctx.clearRect( 0, 0, canvas.width, canvas.height );
                                ctx.drawImage( helper, 0, 0 );
                                me.drawPath( path );

                        }, true );

                        window.addEventListener( 'mouseup', function () {
                            window.removeEventListener('mousemove', move);
                            path = [];
                            down = false;
                        }, false );

                    }, false );
                    return this;

                },
                resize2full: function() {

                },
                drawPath:function( path ) {
                    var color = 'rgba(' + glob.brush.color + ',' + glob.brush.opacity/100 + ')',
                        len = path.length;

                    ctx.save();
                    ctx.lineCap = ctx.lineJoin = "round";
                    ctx.strokeStyle = ctx.fillStyle = color;
                    ctx.lineWidth = glob.brush.size * 2;

                    if( len < 2 ) {
                        var crd = path[0];
                        ctx.beginPath();
                        ctx.arc(crd.x, crd.y, glob.brush.size, 0, Math.PI * 2, false);
                        ctx.fill();
                    } else {
                        ctx.beginPath();
                        for( var i = 0; i < len; i++ ) {
                            var crd = path[i];
                            if ( i === 0 ) ctx.moveTo( crd.x, crd.y );
                            else ctx.lineTo( crd.x, crd.y );
                        }
                        ctx.stroke();
                    }
                    ctx.restore();
                },
                clean: function() {
                    ctx.clearRect( 0, 0, canvas.width, canvas.height );
                    ctx2.clearRect( 0, 0, helper.width, helper.height );
                    return this;
                }
            };
        },
        createBrushControls: function(  ) {
            var me = this,
                sets = this.settings,
                canvas = document.createElement('canvas');

            canvas.id = 'controlsCanvas';
            canvas.width = sets.width;
            canvas.height = sets.tHeight;

            var ctx = canvas.getContext('2d');

            ctx.fillStyle = sets.fill;
            ctx.strokeStyle = sets.stroke;

            var controls = {
                preview: Previewer( ctx ),
                colorPicker: ColorPicker( ctx, 'Цвет:' ),
                sizeSlider: Slider( ctx, 'Толщина:' ),
                opacitySlider: Slider( ctx, 'Насыщенность:' )
            };
            controls.colorPicker.onChangeValue( function( color ) {
                me.brush.color = color;
                changeBrush();
            });
            controls.sizeSlider.onChangeValue( function( percent ){
                me.brush.size = ( sets.maxBrushSize - sets.minBrushSize ) / 100 * percent + sets.minBrushSize;
                changeBrush();
            });
            controls.opacitySlider.onChangeValue( function( percent ) {
                me.brush.opacity = percent;
                changeBrush();
            });


            var addControls = function () {
                var curX = sets.space;
                for( var control in controls ) {
                    var ctrl = controls[control];
                    curX = ctrl.init( curX, sets.tHeight/2 ).fx;
                    curX += sets.space;
                }
            },
                changeBrush = function () {
                    controls.colorPicker.changeValue( me.brush.color );
                    controls.sizeSlider.changeValue( me.brush.size / sets.maxBrushSize * 100 );
                    controls.opacitySlider.changeValue( me.brush.opacity )
                };

            return {
                canvas: canvas,
                controls: controls,
                init: function() {
                    addControls();
                    controls.colorPicker.changeValue( me.brush.color );
                    controls.sizeSlider.changeValue( me.brush.size / sets.maxBrushSize * 100 );
                    controls.opacitySlider.changeValue( me.brush.opacity )
                    return this;
                },
                destroy: function(){}
            }
        },

        appendMarkUp: function( div ) {
            var topbar = document.createElement('div'),
                body = document.createElement('div'),
                controls = document.createElement('div'),
                palitra = document.createElement('div');

            topbar.id = "graffiti_topbar";
            var lft = document.createElement('div'),
                clean = document.createElement('a'),
                cancl = document.createElement('a');
            clean.textContent='Очистить';
            clean.onclick = this._mainCanvas.clean;
            topbar.appendChild( lft.appendChild(clean) );
            clean.textContent = 'Отменить'
            clean.onclick = this._mainCanvas.clean;
            topbar.appendChild( lft.appendChild(clean) );

            body.id = 'graffiti_body';
            body.appendChild(this._mainCanvas.canvas);

            controls.id = 'graffiti_controls';
            controls.appendChild(this._toolCanvas.canvas);
            controls.appendChild(this._toolCanvas.controls.colorPicker.paletteWrap)
            //controls.appendChild(this._paletteCanvas.markUp);

            div.appendChild( topbar );
            div.appendChild( body );
            div.appendChild( controls );

            return div;

        },
        getCursorPosition: function(e, obj) {
            var x, y,
                node = obj? obj: e.target;
            if (e.pageX !== 'undefined' & e.pageY !== 'undefined') {
                x = e.clientX;
                y = e.clientY;
            } else {
                x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }

            while ( node ) {
                x -= node.offsetLeft - node.scrollLeft ;
                y -= node.offsetTop - node.scrollTop ;
                node = node.offsetParent;
            }
            return {
                x: x,
                y: y
            }
        }
    };


    // Pseudo Prototype of Modules
    function CanvasModule ( ctx, title, options ) {
        var me = this,
            callback = function(v){console.log(v)},
            curVal;
        var ctx = ctx || document.createElement('canvas').getContext('2d');
        return {
            ctx: ctx,
            canvas: ctx.canvas,
            init: function( x, y ) {
                if( title ) x = this.addTitle( x, y, title).fx;
                this.position = {
                    sx: x,
                    fx: x + this.sets.width,
                    sy: y - this.sets.height / 2,
                    fy: y + this.sets.height / 2
                };
                this.position.sx = Math.round( this.position.sx || 0 ) + 0.5;
                this.position.sy = Math.round( this.position.sy || 0 ) + 0.5;
                console.log(this.position)

                for( var event in this.events || {} ) {
                   (function ( e, fn ) {
                       ctx.canvas.addEventListener( e, function( ev ) { fn.call( me, ev ); }, true );
                   }) ( event, this.events[event] );
                }

                return this.position;
            },
            setSets: function( s, c ) {
                if( options ) for( var prop in options ) s[prop] = options[prop];
                s.width = s.width || 0;
                s.height = s.height || 0;
                c.w && c.w.forEach( function( x ) { if( s[x] ) s.width += s[x]; });
                c.h && c.h.forEach( function( y ) { if( s[y] ) s.height += s[y]; });

                this.sets = s;
                return s;
            },
            onChangeValue: function( fn ) {
                callback = fn;
            },
            changeValue: function ( value ) {
                if ( curVal === value ) return false;
                curVal = value;
                callback( curVal );
                return curVal;
            },
            addTitle: function( x, y, title ) {
                ctx.save();
                ctx.textBaseline = 'middle';
                ctx.font = '11px tahoma, arial, verdana, sans-serif, Lucida Sans;';
                ctx.fillStyle = '#272727';
                ctx.lineWidth = 0.5;
                ctx.fillText(title, x, y);
                ctx.restore();
                return {
                    fx: x + ctx.measureText(title).width + 20
                };
            },
            getCursorPosition: function(e, obj) {
                var x, y,
                    node = obj? obj: e.target;
                if (e.pageX !== 'undefined' & e.pageY !== 'undefined') {
                    x = e.clientX;
                    y = e.clientY;
                } else {
                    x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                    y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
                }

                while ( node ) {
                    x -= node.offsetLeft - node.scrollLeft ;
                    y -= node.offsetTop - node.scrollTop ;
                    node = node.offsetParent;
                }
                return {
                    x: x,
                    y: y
                }
            }
        };
    }


    function Canvas ( options ) {
        var me = CanvasModule( options),
            sets = me.setSets({
                height: 300
            }, {
                w: ['height', 'height']
            });

        var canvas = me.canvas,
            ctx = me.ctx,
            helper = document.createElement('canvas'),
            help_ctx = helper.getContext('2d');

        canvas.width = helper.width = sets.width;
        canvas.height = helper.height = sets.height;

        // mouse events
        me.events = function() {
            var down = false,
                path = [],
                move = function(e) {
                    if ( !down ) return;
                    var cords = me.getCursorPosition( e, canvas );

                    path.push(cords);
                    ctx.clearRect( 0, 0, canvas.width, canvas.height );
                    ctx.drawImage( helper, 0, 0 );
                    me.drawPath( path );
                };
            return {
                mousedown: function ( e ) { e.preventDefault();
                    var cords = me.getCursorPosition(e);

                    path = [cords];
                    down = true;

                    help_ctx.clearRect( 0, 0, helper.width, helper.height );
                    help_ctx.drawImage( ctx.canvas, 0, 0 );

                    me.drawPath( path );

                    window.addEventListener( 'mousemove', move, true );

                    window.addEventListener( 'mouseup', function () {
                        path = [];
                        down = false;
                        window.removeEventListener( 'mousemove', move );
                    }, false );
                },
                mouseup: function( e ) { e.preventDefault();
                    window.removeEventListener( 'mousemove', move );
                }
            }

        } ();

        // extend Init Method
        var s_init = me.init;
        me.init = function() {
            me.canvas = ctx.canvas;
            s_init.call(me, arguments );
            return me;
        };

        // drawPath by array of cords
        me.drawPath = function( path ) {
            var curVal = me.curVal || {
                    color: '0,0,0',
                    size: 15,
                    opacity: 100
                },
                color = 'rgba(' + curVal.color + ',' + curVal.opacity/100 + ')',
                len = path.length;

            ctx.save();
            ctx.lineCap = ctx.lineJoin = "round";
            ctx.strokeStyle = ctx.fillStyle = color;
            ctx.lineWidth = curVal.size * 2;

            if( len < 2 ) {
                var crd = path[0];
                ctx.beginPath();
                ctx.arc(crd.x, crd.y, curVal.size, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.closePath();
            } else {
                ctx.beginPath();
                for( var i = 0; i < len; i++ ) {
                    var crd = path[i];
                    if ( i === 0 ) ctx.moveTo( crd.x, crd.y );
                    else ctx.lineTo( crd.x, crd.y );
                }
                ctx.stroke();
                ctx.closePath();
            }
            ctx.restore();
        }

        me.constructor = arguments.callee;
        return me;
    }

    function Previewer ( ctx, title, options ) {
        var me = CanvasModule( ctx, title, options),
            sets = me.setSets({
                minSize: 3,
                maxSize: 23
            }, {
                w: ['maxSize', 'maxSize'],
                h: ['maxSize', 'maxSize']
            });

        // extend ChangeValue Method
        var s_change = me.changeValue;
        me.changeValue = function ( val ) {
            var pos = me.position;
            ctx.clearRect(
                pos.sx - 2, pos.sy - 2,
                sets.width + 4, sets.height + 4
            );
            ctx.save();
            ctx.beginPath();
            ctx.arc( pos.sx + sets.width/2, pos.sy + sets.width/2, val.size, 0, Math.PI * 2, false);
            ctx.fillStyle = 'rgba(' + val.color + ',' + val.opacity/100 + ')';
            ctx.fill();
            ctx.restore();
        };

        me.constructor = arguments.callee;
        return me;
    }

    function ColorPicker ( ctx, title, options ) {
        var me = CanvasModule( ctx, title),
            sets = me.setSets({
            cbSize: 12,
            blMargin: 0.51,
            colorStep: 51,
            trW: 14,
            trH: 5,
            vSpace: 2
        }, {
            w: ['trW'],
            h: ['trH', 'vSpace', 'cbSize']
        }),

            // private functions
            drawTriangle = function( hover ) {
                var pos = me.position,
                    sets = me.sets;

                ctx.save();
                ctx.clearRect( pos.sx, pos.sy, sets.trW, sets.trH );
                if ( hover ) ctx.fillStyle = 'white';

                ctx.beginPath();
                ctx.moveTo(pos.sx + sets.trW / 2, pos.sy);
                ctx.lineTo(pos.fx, pos.sy + sets.trH-0.5);
                ctx.lineTo(pos.sx, pos.sy + sets.trH-0.5);
                ctx.lineTo(pos.sx + sets.trW / 2, pos.sy);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            },
            drawColorBlock = function( color ) {
                var pos = this.position,
                    sets = this.sets;

                ctx.save();
                ctx.clearRect(
                    pos.sx, pos.sy + sets.trH + sets.space - 1,
                    sets.cbSize+2, sets.cbSize+2
                );
                ctx.fillStyle = 'rgb('+color+')';
                ctx.fillRect(pos.sx + 1, pos.sy + sets.trH + sets.vSpace, sets.cbSize, sets.cbSize);
                ctx.restore();
            },
            createPalette = function( x, y ) {
                var canvas = document.createElement('canvas'),
                    wrap = document.createElement('div');
                canvas.width = sets.cbSize * 18 + sets.blMargin * 2;
                canvas.height = sets.cbSize * 12 + sets.blMargin * 2;
                canvas.setAttribute( 'class', 'palette' );
                wrap.setAttribute( 'class', 'palette_wrap' );
                wrap.appendChild(canvas);
                wrap.style.display = 'none';
                wrap.style.position = 'absolute';
                wrap.style.left = x + 'px';
                wrap.style.top = y - canvas.height-20 + 'px';

                me.paletteWrap = wrap;

                var palette_ctx = canvas.getContext('2d');
                return Palette( palette_ctx );
            };

        me.togglePalette = function() {
            var el = me.paletteWrap,
                disp = el.style.display,
                fn = function() {
                    if ( el.style.display !== "none" ) me.togglePalette();
                    window.removeEventListener('click', fn, false);
                };

            if ( disp == "none" ) {
                el.style.display = 'block';
                setTimeout(function() {
                    window.addEventListener('click', fn, false);
                }, 10);
            } else {
                el.style.display = "none";
                window.removeEventListener('click', fn, false);
            }
        };

        // mouse events
        me.events = function() {
            var yetHover = false;
            return {
                mousemove: function(e) {
                    var cords = me.getCursorPosition(e),
                        pos = me.position;
                    if ( cords.x >= pos.sx-3 && cords.x <= pos.fx+3 && cords.y >= pos.sy-3 && cords.y <= pos.fy+3 ) {
                        drawTriangle( yetHover = true );
                    } else if( yetHover == true )
                        drawTriangle( yetHover = false );
                },
                click: function(e) {
                    var cords = me.getCursorPosition(e),
                        pos = me.position;
                    if ( cords.x >= pos.sx-3 && cords.x <= pos.fx+3 && cords.y >= pos.sy-3 && cords.y <= pos.fy+3 ) {
                        me.togglePalette();
                    }
                }
            }
        } ();

        // extend Init Method
        var s_init = me.init;
        me.init = function( x, y ) {
            var pos = s_init.apply(me, arguments );

            drawTriangle.call(this, false);
            me.changeValue('60,10,20');

            me.palette = createPalette( pos.sx, pos.sy ).init();
            me.palette.onChangeValue( me.changeValue )

            return pos;
        };

        // extend ChangeValue Method
        var s_change = me.changeValue;
        me.changeValue = function ( value ) {
            var val = s_change.call( me, value );
            val && drawColorBlock.call( me, val );
        };

        me.constructor = arguments.callee;
        return me;
    }

    function Palette ( ctx, options ) {
        var me = CanvasModule( ctx),
            sets = me.setSets({
            cbSize: 12,
            blMargin: 0.5,
            colorStep: 51,
            tworows: true
        }, {} );

        sets.width = sets.cbSize * 18 + sets.blMargin * 2;
        sets.height = sets.cbSize * 12 + sets.blMargin * 2;

        // private functions
        var drawColorBlock = function(x, y, color, hover) {
                var size = sets.cbSize;
                ctx.save();
                ctx.fillStyle = color;
                ctx.strokeStyle = hover ? '#fff' : '#000';

                color && ctx.fillRect(x, y, size, size);
                ctx.strokeRect(x, y, size, size);
                ctx.restore();
            },
            makeTable = function() {
                var color;
                // -- blocks
                for (var b = 0; b < 6; b++ ) {
                    // -- rows
                    for ( var r = 0; r < 6; r++ ) {
                        var cur_y = sets.cbSize * r + sets.blMargin;
                        if ( b > 2 ) cur_y += sets.cbSize * 6;
                        // -- columns
                        for ( var c = 0; c < 6; c++ ) {

                            var cur_x = sets.cbSize * c + sets.blMargin;
                            cur_x += (b > 2) ? sets.cbSize * 6 * (b - 3) : sets.cbSize * 6 * b;

                            color = "rgb(" + sets.colorStep * b + ", " + sets.colorStep * c + ", " + sets.colorStep * r + ")";
                            drawColorBlock(cur_x, cur_y, color, false);
                        }
                    }
                }
            },
            getColor = function( cords ) {
                var c = (cords.x - cords.x % sets.cbSize) / sets.cbSize,
                    r = (cords.y - cords.y % sets.cbSize) / sets.cbSize,
                    b = ((c - c % 6) / 6 + (r - r % 6) / 2),
                    step = sets.colorStep,
                    color = [];
                color.push( step * b );
                color.push( step * ( c - b % 3 * 6 ) );
                color.push( step * ( r - ( b - b % 3 ) / 3 * 6 ) );
                return color.join(', ');
            };

        // mouse events
        me.events = function() {
            var prev = { x: 0.5, y: 0.5 };
            return {
                click: function ( e ) {
                    var cords = me.getCursorPosition( e ),
                        color = getColor( cords );
                    me.changeValue( color );
                },
                mousemove: function ( e ) {
                    var cords = me.getCursorPosition(e);
                    if( cords.x > ( sets.cbSize * 18 - 1 ) &&
                        cords.y > ( sets.cbSize * 12 - 1 ) ) return;

                    // cords of target cell
                    cords.x -= cords.x % sets.cbSize - sets.blMargin;
                    cords.y -= cords.y % sets.cbSize - sets.blMargin;

                    if (prev == cords) return;

                    // redraw prev selected cell
                    drawColorBlock(prev.x, prev.y, false, false);
                    drawColorBlock(prev.x, prev.y, false, false);
                    prev = cords;
                    // select cur cell
                    drawColorBlock(cords.x, cords.y, false, true);
                }
            }
        } ();

        // extend Init Method
        var super_init = me.init;
        me.init = function( ) {
            super_init.call(this, arguments);
            makeTable();
            return this;
        };

        me.constructor = arguments.callee;
        return me;
    }

    function Slider ( ctx, title, options ) {
        var me = CanvasModule( ctx, title, options),
            sets = me.setSets({
            ordW: 100,
            ordH: 4,
            space: 2,
            marks: 10,
            markW: 1,
            markH: 5,
            handlerW: 8,
            handlerH: 10
        }, {
            w: ['ordW'],
            h: ['markH', 'space', 'handlerH']
        }),

            // private functions
            drawStatic = function () {
                var pos = me.position;

                // draw Marks
                ctx.beginPath();
                for ( i = 1; i < sets.marks; i++ ) {
                    ctx.moveTo(pos.sx + (sets.ordW / sets.marks) * i, pos.sy);
                    ctx.lineTo(pos.sx + (sets.ordW / sets.marks) * i, pos.sy + sets.markH);
                }
                ctx.stroke();
                ctx.closePath();
            },
            drawDynamic = function( percent ) {
                if( percent > 99 ) percent = 100;
                if( percent < 1 ) percent = 0;
                var pos = me.position,
                    cordX = pos.sx + ( sets.width  ) / 100 * percent - sets.handlerW/2;

                // clean prev slider position
                ctx.clearRect(pos.sx - 5, pos.sy + sets.markH, sets.width + 15, sets.height + 5);

                // draw Ord
                var ordPosy = ( pos.sy + sets.markH + sets.space + ( sets.handlerH - sets.ordH ) / 2 );
                ctx.fillRect(pos.sx, ordPosy, sets.ordW, sets.ordH);
                ctx.strokeRect(pos.sx, ordPosy, sets.ordW, sets.ordH);

                // draw Handler
                ctx.fillRect(cordX, ordPosy - (sets.handlerH - sets.ordH) / 2, sets.handlerW, sets.handlerH);
                ctx.strokeRect(cordX, ordPosy - (sets.handlerH - sets.ordH) / 2, sets.handlerW, sets.handlerH);
            },
            move = function ( e ) { e.preventDefault();
                var cords = me.getCursorPosition( e ),
                    p = me.position,
                    percent = 0;
                if ( cords.x < p.sx   ) percent = 0;
                else if ( cords.x > p.fx - sets.handlerW/2 ) percent = 100;
                else percent = Math.round(( cords.x - p.sx ) / sets.width * 100);

                me.changeValue(percent);
            };

        // mouse events
        me.events = function() {
            return {
                mousedown: function ( e ) {
                    e.preventDefault();
                    var c = me.getCursorPosition(e),
                        p = me.position;

                    if ( !(c.x >= p.sx-3 && c.x <= p.fx+5
                        && c.y >= p.sy && c.y <= p.fy ) ) return;

                    var percent = Math.round( ( c.x - p.sx ) / sets.width * 100 );
                    me.changeValue(percent);

                    window.addEventListener( 'mousemove', move, false );
                    window.addEventListener( 'mouseup', function ( e ) { e.preventDefault();
                        window.removeEventListener( 'mousemove', move );
                    }, false );
                }
            };
        } ();

        // extend Init Method
        var super_init = me.init;
        me.init = function( x, y ) {
            var pos = super_init.call( this, x, y );

            drawStatic();
            drawDynamic( 0 );

            return pos;
        };

        // extend ChangeValue Method
        var s_change = me.changeValue;
        me.changeValue = function ( value ) {
            var val = s_change.call( me, value );
            val && drawDynamic( val );
        };

        me.constructor = arguments.callee;
        return me;
    }


    $.fn.graffiti = function (options) {
        for (var prop in options) {
            def[prop] = options[prop]
        }
        this.each(function () {
            Graff.init( this );
        });
    };

})($);