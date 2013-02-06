"use strict"

function Canvas( elem, options ) {
    var me = this;

    me.$elem = $( elem );
    me.options = $.extend( me.defaults, options );

    me.brush = me.options.brush;
    me.mouse = {
        down: false,
        x: [], y:[]
    };

    me.addTopBar();
    me.addResizer();
    me.addCanvases();
    me.addControls();

    me.resizeCanvases();
    me.build();


}
Canvas.prototype = {

    defaults: {
        width: 594,
        height: 297,
        headerHeight: 50,
        resizerHeight: 16,
        cpHeight: 65,
        topbarHeight: 16,
        brush: {
            size: 6, minSize: .051, maxSize: 32,
            opacity: .75, minOpacity:.01, maxOpacity: 1,
            color: '51,102,153'
        },
        controls: {
            space: 16
        }
    },

    koef: 1,
    hstorage: [],
    checkPoint: "",
    backBlocked: false,
    backQueue: 0,

    blockResize: false,
    fsEnabled: false,

    addTopBar: function() {
        var me = this;

        me.cleanBtn  = $('<a/>', { 'class': 'cleanBtn',  'title': 'Очистить', 'text': 'Очистить' });
        me.cancelBtn = $('<a/>', { 'class': 'cancelBtn', 'title': 'Отменить', 'text': 'Отменить' });
        me.saveBtn   = $('<a/>', { 'class': 'saveBtn', 'title': 'Сохранить', 'text': 'Сохранить' });
        me.fullBtn   = $('<a/>', { 'class': 'fullBtn', 'title': 'Увеличить', 'text': 'Увеличить' });

        me.cleanBtn.on('mousedown', $.proxy( me.clean, me ));
        me.cancelBtn.on('mousedown', $.proxy( me.backHistory, me ));
        me.fullBtn.on('mousedown', $.proxy( me.fullScreen, me ));
        me.saveBtn.on('mousedown', $.proxy( me.save, me ));

    },
    addCanvases: function() {
        var me = this,
            opts = me.options;

        me.$canvas = createCanvas( opts.width, opts.height );
        me.ctx = me.$canvas[0].getContext('2d');

        me.$fake = me.$canvas.clone();
        me.fakeCtx = me.$fake[0].getContext('2d');

        me.$hist = me.$canvas.clone();
        me.histCtx = me.$hist[0].getContext('2d');


        me.$fake.on('mousedown', $.proxy( me.handleDrawEvents, me ));
        $(window).on('mousemove mouseup', $.proxy( me.handleDrawEvents, me ));

    },
    addResizer: function() {
        var me = this;
        me.$resizer = $('<div/>', { 'class': 'resizer' });
        me.$resizer.on( 'mousedown', $.proxy( me.handleResizeEvents, me ) );
        $(window).on('mousemove mouseup', $.proxy(me.handleResizeEvents, me))

    },
    addControls: function( ) {
        var me = this,
            opts = this.options,
            brush = opts.brush;

        var $canvas = createCanvas( opts.width, opts.cpHeight),
            ctx = $canvas[0].getContext('2d');

        ctx.fillStyle   = 'rgb(225,225,225)';
        ctx.strokeStyle = 'rgb(125,125,125)';
        ctx.lineWidth = 0.5;
        ctx.save();

        me.$cp = $canvas;
        me.$cpCtx = ctx;

        var space = opts.controls.space,
            ctrlPosition = { x: space, y: opts.cpHeight/2 };

        var drawSample = function() {
            ctx.save();
            ctx.clearRect(space-2, 0, brush.maxSize*2+4, brush.maxSize*2+2);
            ctx.fillStyle = "rgba("+brush.color+", "+brush.opacity+")";
            ctx.beginPath();
            ctx.arc( space+brush.maxSize, ctrlPosition.y, normalizeXY(brush.size), 0, Math.PI * 2, false);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        };

        drawSample();
        ctrlPosition.x += brush.maxSize*2 + space*2;

            ctrlPosition.x += addTitle( ctx, 'Цвет:', ctrlPosition ) + 10;
        var colorPicker = new ColorPicker( $canvas, ctx, ctrlPosition, {
            onChange: function( color ) {
                me.brush.color = color;
                drawSample();
            }
        });
        ctrlPosition.x += colorPicker.position.w + space*3;
        me.$paletteCanvas = colorPicker.$palette;
        me.$paletteCtx = colorPicker.$paletteCtx;


        ctrlPosition.x += addTitle( ctx, 'Толщина:', ctrlPosition ) + 10;
        var sizeScroll = new Scroll( $canvas, ctx, ctrlPosition, {
            onChange: function( percent ) {
                me.brush.size = ( brush.maxSize - brush.minSize ) / 100 * percent + brush.minSize;
                drawSample();
            }
        });
        ctrlPosition.x += sizeScroll.position.w + space;

        ctrlPosition.x += addTitle( ctx, 'Интенсивность:', ctrlPosition ) + 10;
        var opacityScroll = new Scroll( $canvas, ctx, ctrlPosition, {
            onChange: function( percent ) {
                me.brush.opacity = ( brush.maxOpacity - brush.minOpacity ) / 100 * percent + brush.minOpacity;
                drawSample();
            }
        });
        ctrlPosition.x += opacityScroll.position.w + space;

    },
    build: function() {
        var me = this, opts = me.options;

        me.$elem.append(

            $('<header/>').append(
                $('<h3/>', { 'class': 'title', 'text': 'Ваше граффити на  стену Mr Jesus' })
            ),

            $('<div/>', { 'class': 'topbar' }).append(
                $('<div/>', { 'class': 'fl_l'} ).append(
                    me.cleanBtn, '<span> | </span>', me.cancelBtn
                ),
                $('<div/>', { 'class': 'fl_r'} ).append(
                    me.saveBtn, '<span> | </span>', me.fullBtn
                )
            ),

            $('<div/>', { 'class': 'canvas_wrap' }).append(
                $('<div/>', { 'class': 'canvas_aligner', 'width': opts.width, 'height': opts.height }).append(
                    me.$canvas.addClass('main'),
                    me.$fake.addClass('fake'),
                    me.$hist.addClass('hist')
                ),
                me.$resizer
            ),


            $('<div/>', { 'class': 'toolbar', 'width': opts.width, 'height': opts.cpHeight }).append(
                me.$cp.addClass('cp'),
                $('<div/>', { 'class': 'palette_wrap' }).append(
                    me.$paletteCanvas.addClass('palette')
                )
            )
        );

        var offset = me.$canvas.offset();
        me.position = {
            'x': offset.left,  'y': offset.top,
            'w': me.$canvas.width(),'h': me.$canvas.height()
        };
    },

    handleResizeEvents: function( e ) {
        var opts = this.options;
        switch( e.type ) {
            case "mousedown":
                $('body').css('cursor', "s-resize");
                this.resizing = true;
                this.lastCordY = e.pageY;
                this.ctx.clearRect( 0, 0, opts.width, opts.height );
                break;

            case "mousemove":
                if( !this.resizing ) return;

                var opts = this.options,
                    wrap = this.$canvas.parent(),
                    height = parseInt( wrap.height() ),
                    cordY = e.pageY;

                var newHeight = height + cordY - this.lastCordY;
                if ( newHeight > 600 ) newHeight = 600;
                if ( newHeight < 297 ) newHeight = 297;
                this.resH = newHeight;

                var newWidth = newHeight / opts.height * opts.width;
                this.resW = newWidth;

                wrap.width(newWidth).height(newHeight)
                this.$elem
                    .height( opts.headerHeight + opts.topbarHeight + newHeight + opts.resizerHeight + opts.cpHeight + 40 )
                    .width( newWidth + 32 );

                this.onResize && this.onResize(newWidth, newHeight);

                this.lastCordY = cordY;
                break;

            case "mouseup":
                if( !this.resizing ) return;
                $('body').css('cursor', "default");
                this.resizing = false;
                this.lastCordY = 0;
                this.koef = this.resH / 297;
                this.options.width = this.resW;
                this.options.height = this.resH;
                this.resizeCanvases();
                this.copyImage( this.ctx );
                break;
        }

    },
    resizeCanvases: function( only ) {
        var opts = this.options;
        if ( !only ) {
            this.$elem
                .height( opts.headerHeight + opts.topbarHeight + opts.height + opts.resizerHeight + opts.cpHeight + 40 )
                .width( opts.width + 32 );
        }
        this.$canvas.parent().find('canvas')
            .attr('width', opts.width )
            .attr('height', opts.height );
    },
    fullScreen: function() {
        var me = this,
            opts = me.options,
            time = 400;
        if ( me.mouse.down || me.blockResize ) return;

        if ( !me.fsEnabled ) {
            me.fsEnabled = true;
            me.blockResize = true;

            var width = (window.innerWidth - 40),
                height = Math.min( (297 / 594) * width, window.innerHeight - 133);

            width = height * ( 594 / 297 );

            me.options.width = width;
            me.options.height= height;
            me.koef = height / 297;

            me.$canvas.hide();
            this.$elem.animate({
                width: window.innerWidth-2,
                height: '100%'
            }, time, function() {
                $(this).addClass('full');
                me.fullBtn.text('Уменьшить').attr('title', 'Уменьшить');

                me.resizeCanvases( true );
                me.copyImage( me.ctx );
                me.blockResize = false;
                me.$canvas.fadeIn(300);
            });

            me.$elem.find('header').slideUp(time);
            me.$resizer.slideUp(time);

            me.$canvas.parent().animate({
                width: width,
                height: height
            }, time);

        } else {
            me.fsEnabled = false;
            me.blockResize = true;

            me.options.width = me.resW || 594;
            me.options.height = me.resH || 297;
            me.koef = me.options.height / 297;

            me.$canvas.hide();
            me.$elem.animate({
                width: opts.width + 32,
                height: opts.headerHeight + opts.topbarHeight + opts.height + opts.resizerHeight + opts.cpHeight + 40
            }, time, function() {
                $(this).removeClass('full');
                me.fullBtn.text('Увеличить').attr('title', 'Увеличить');

                me.resizeCanvases( true );
                me.copyImage( me.ctx );
                me.blockResize = false;
                me.$canvas.fadeIn(300);
            });

            me.$elem.find('header').slideDown(time);
            me.$resizer.slideDown(time);

            me.$canvas.parent().animate({
                width: opts.width,
                height: opts.height
            }, time);

        }
    },
    copyImage: function(ctx, callback) {
        var me = this;
        me.drawHistory();
        callback && callback();
    },

    handleDrawEvents: function( e ) {
        var path = getMouseXY( this.$canvas, e),
            opts = this.options;

        switch ( e.type ) {

            case 'mousedown':
                this.down = true;
                this.mouse.x = [ path.x ];
                this.mouse.y = [ path.y ];
                this.draw( this.fakeCtx );
            break;

            case 'mousemove':
                if ( !this.down ) return;
                if ( this.mouse.x == path.x && this.mouse.y == path.y ) return;

                this.fakeCtx.clearRect( 0, 0, opts.width, opts.height );
                this.mouse.x.push( path.x );
                this.mouse.y.push( path.y );
                this.draw( this.fakeCtx );
            break;

            case 'mouseup':
                if ( !this.down ) return;
                this.down = false;

                this.fakeCtx.clearRect( 0, 0, opts.width, opts.height );
                this.draw( this.ctx );
                this.pushHistory({
                    mouse : { x: this.mouse.x, y: this.mouse.y },
                    color: this.brush.color,
                    size: this.brush.size * this.koef,
                    opacity: this.brush.opacity,
                    koef: this.koef
                });
                this.mouse.x = [];
                this.mouse.y = [];

            break;
        }

    },
    draw: function( ctx, hist ) {
        var me = this,
            mouse, color, size, opacity;

        if( hist ) {
            mouse = hist.mouse;
            color = hist.color;
            opacity = hist.opacity;
            size = hist.size;
        } else {
            mouse = me.mouse;
            color = me.brush.color;
            size = me.brush.size * me.koef;
            opacity = me.brush.opacity;
        }
        var x = mouse.x, y = mouse.y,
            lenX = x.length;

        ctx.strokeStyle = "rgba("+color+", "+opacity+")";
        ctx.lineWidth = size*2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo( x[0], y[0] );

        if ( lenX < 2 ) {
            ctx.lineTo( x[0] + 0.51, y[0] );
            ctx.stroke();
            ctx.closePath();
            return;
        }

        ctx.lineTo( ( x[0] + x[1] ) * .5, ( y[0] + y[1] ) * .5 );

        var i = 0, abs = Math.abs, abs1, abs2;
        while ( ++i < ( lenX - 1 ) ) {
            abs1 = abs( x[i-1] - x[i] ) + abs( y[i-1] - y[i] )
                 + abs( x[i] - x[i+1] ) + abs( y[i] - y[i+1] );

            abs2 = abs( x[i-1] - x[i+1] ) + abs( y[i-1] -  y[i+1] );

            if( abs1 > 10 && abs2 > abs1 * .8 ) {
                ctx.quadraticCurveTo( x[i], y[i], ( x[i] + x[i+1] ) * .5, ( y[i] + y[i+1] ) * .5 );
                continue;
            }

            ctx.lineTo( x[i], y[i]);
            ctx.lineTo( ( x[i] + x[i+1]) * .5, ( y[i] + y[i+1]) * .5 );
        }

        ctx.lineTo( x[lenX-1], y[lenX-1] );
        ctx.moveTo( x[lenX-1], y[lenX-1] );
        ctx.stroke();
        ctx.closePath();
    },

    pushHistory: function( state ) {
        var me = this;
        me.hstorage.push( state );

        me.histCtx.clearRect(0, 0, me.options.width, me.options.height);
        me.drawHistory();
    },
    backHistory: function() {
        var me = this,
            opts = me.options,
            storage = me.hstorage,
            len = storage.length;

        if ( len === 0 ) {
            me.backQueue = 0;
            if ( me.checkPoint == "" ) return false;
            else {
                me.hstorage = [];
                me.checkPoint = "";
            }
        } else {
            if( me.backBlocked ) {
                me.backQueue++;
                return;
            }
            me.backBlocked = true;

            if( me.checkPoint != '' ) {
                $('<img/>', { src: thmeis.checkPoint }).on('load', function() {
                    me.$hist.fadeIn(200, function() {
                        me.ctx.clearRect( 0, 0, opts.width, opts.height );
                        me.ctx.drawImage( this, 0, 0, opts.width, opts.height );
                        me.redrawHistory();
                    });
                });
            } else {
                me.ctx.clearRect(0, 0, opts.width, opts.height );
                me.redrawHistory();
            }
        }
    },
    drawHistory: function() {
        var me = this,
            storage = me.hstorage,
            len = storage.length,
            _x = [], _y = [],
            _s, koef;

        for ( var i = 0; i < len - 1; i++ ) {
            var state = storage[i];
            if ( !state ) return;

            koef = state.koef;
            _s = state.size / koef * me.koef;

            for( var j = 0; j < state.mouse.x.length; j++ ) {
                _x.push( state.mouse.x[j] / koef * me.koef );
                _y.push( state.mouse.y[j] / koef * me.koef );
            }

            me.draw( me.histCtx, { mouse : {x:_x, y: _y}, size: _s, color: state.color, opacity: state.opacity });
            _x = []; _y = [];
        }

        me.checkPoint = me.$hist[0].toDataURL();

        $('<img/>', { src: me.checkPoint }).on('load', function() {
            me.ctx.clearRect( 0, 0, me.options.width, me.options.height );
            me.ctx.drawImage( this, 0, 0, me.options.width, me.options.height );
            me.propDraw( me.ctx, me.hstorage, len - 1, len );
        });
    },
    redrawHistory: function() {
        var me = this;

        me.$hist.fadeOut(0, function() {
            me.histCtx.clearRect(0, 0, me.options.width, me.options.height );
            me.propDraw( me.histCtx, me.hstorage, 0, me.hstorage.length - 2);

            me.checkPoint = me.$hist[0].toDataURL();
            me.backBlocked = false;
            if( me.backQueue > 0 ) {
                for( var i = 0; i < me.backQueue; i++) {
                    me.backHistory();
                    me.backQueue--;
                }
            }
            me.hstorage.pop();
        });
    },
    propDraw: function( ctx, storage, from, to ) {
        var _x = [], _y = [],
            _s, state, koef;

        for ( var i = from; i < to; i++ ) {
            state = storage[i];
            if ( !state ) return;

            koef = state.koef;
            _s = state.size / koef * this.koef;

            for( var j = 0; j < state.mouse.x.length; j++ ) {
                _x.push( state.mouse.x[j] / koef * this.koef );
                _y.push( state.mouse.y[j] / koef * this.koef );
            }

            this.draw( ctx, {
                mouse : { x:_x, y: _y },
                size: _s,
                color: state.color,
                opacity: state.opacity
            });

            _x = []; _y = [];
        }
    },

    clean: function() {
        var opts = this.options;
        this.hstorage = [];
        this.checkPoint = "";
        $.each([ this.ctx, this.fakeCtx ], function(i, ctx) {
            ctx.clearRect(0,0, opts.width, opts.height)
        });
    },
    save: function() {
        window.open(this.$canvas[0].toDataURL(),'',
            'width='+this.options.width+
            ',height='+this.options.height);
    }
};


var CanvasModule = function( module, $canvas, ctx, pos ) {
    var me = module;
    me.$canvas = $canvas;
    me.ctx = ctx || $canvas[0].getContext('2d');

    me.addTitle = function( title, pos ) {
        pos = normalizeXY( pos || this.position );
        me.ctx.fillText( title, pos.x, pos.y );
        return ctx.measureText( title ).width;
    };

    me.setPositionProps = function( w, h ) {
        me.position = {
            x: pos.x,
            y: pos.y,
            w: w,
            h: h,
            sx: normalizeXY(pos.x),
            sy: normalizeXY(pos.y - h/2),
            ex: normalizeXY(pos.x + w),
            ey: normalizeXY(pos.y + h/2)
        }
    };
    me.getMouse = function( e ) {
        var pos = me.position,
            cords = getMouseXY( me.$canvas, e),
            x = cords.x, y = cords.y;

        return {
            isOver: !( x < pos.x || x > pos.ex || y < pos.sy || y > pos.ey ),
            x: x,
            y: y
        };
    };

    return me;
};

var ColorPicker = function( $canvas, ctx, pos, options ) {
    var me = new CanvasModule( this, $canvas, ctx, pos ),
        opts = me.options = $.extend( options, me.defaults );

    me.setPositionProps( opts.trW,  opts.trH + opts.spaceH + opts.cbSize );

    me.createPalette();
    me.drawTriangle();
    me.setValue( opts.value );

    $( window ).on({
        'mousedown': $.proxy( me._onMouseDown, me )
    });

    return me;
};
ColorPicker.prototype = {
    defaults: {
        value: '51,102,153',
        cbSize: 14,
        blMargin: .5,
        colorStep: 51,
        trW: 16,
        trH: 6,
        spaceH: 3
    },

    createPalette: function() {
        var me = this,
            opts = me.options,

            $palette = createCanvas(
                opts.cbSize * 18 + opts.blMargin * 2,
                opts.cbSize * 12 + opts.blMargin * 2
            ),
            pCtx = $palette[0].getContext('2d'),

            size = opts.cbSize,
            step = opts.colorStep,
            blMargin = opts.blMargin,
            color, cur_x, cur_y;

        // Calculate and Draw color table
        for ( var b=0; b < 6; b++ ) { // blocks
            for ( var r = 0; r < 6; r++ ) { // rows

                cur_y = size * r + blMargin;
                if ( b > 2 ) cur_y += size * 6;

                for ( var c=0 ; c < 6; c++ ) { // columns
                    cur_x = size * c + blMargin;
                    cur_x += b > 2 ? size * 6 * ( b - 3 ) : size * 6 * b;

                    color = [ step * b, step * c, step * r ].join(', ');
                    me.drawColorBlock( pCtx, { x: cur_x, y: cur_y }, color, '0,0,0' );
                }
            }
        }

        // Attach Palette Events
        var prevHover = null;
        $palette.on({
            mousedown: function( e ) {
                var cords = getMouseXY( $palette, e );
                me.setValue( me.getColor( cords ) );
            },
            mousemove: function ( e ) {
                var cords = getMouseXY( $palette, e),
                    color = me.getColor( cords );

                if ( cords.x >= size * 18 || cords.y >= size * 12 ) return;

                cords.x -= cords.x % size - blMargin;
                cords.y -= cords.y % size - blMargin;

                if ( prevHover ) {
                    if ( prevHover.cords == cords ) return;
                    me.drawColorBlock( pCtx, prevHover.cords, prevHover.color, '0,0,0' );
                }

                prevHover = { cords: cords, color: color };
                me.drawColorBlock( pCtx, cords, color, '255,255,255');
            }
        });

        me.$palette = $palette;
        me.paletteCtx = pCtx;

    },

    drawTriangle: function( hover ) {
        var ctx = this.ctx,
            pos = this.position,
            opts = this.options,
            sy = pos.sy;

        ctx.clearRect( pos.x, sy, opts.trW, opts.trH );

        ctx.save();
        if ( hover ) ctx.fillStyle = 'white';

        ctx.beginPath();
        ctx.moveTo( pos.x + pos.w / 2, sy );
        ctx.lineTo( pos.ex, sy + opts.trH );
        ctx.lineTo( pos.x,  sy + opts.trH );
        ctx.lineTo( pos.x + pos.w / 2, sy);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();

        ctx.restore();
    },
    drawColorBlock: function( ctx, pos, fill, stroke ) {
        var opts = this.options,
            size = opts.cbSize;

        ctx.save();

        ctx.fillStyle = 'rgb(' + fill + ')';
        ctx.strokeStyle = 'rgb('+ stroke + ')' || fill;
        ctx.clearRect( pos.x-.5, pos.y-.5, size+1, size+1 );
        fill && ctx.fillRect( pos.x, pos.y, size, size );
        stroke && ctx.strokeRect( pos.x, pos.y, size, size );

        ctx.restore();
    },

    getColor: function( cords ) {
        var opts = this.options,
            size = opts.cbSize,
            step = opts.colorStep,

            c = ( cords.x - cords.x % size ) / size,
            r = ( cords.y - cords.y % size ) / size,
            b = ( c - c % 6 ) / 6 + ( r - r % 6 ) / 2;

        return [
            step * b,
            step * ( c - b % 3 * 6 ),
            step * ( r - ( b - b % 3 ) / 3 * 6 )
        ].join(',');
    },
    setValue: function( color ) {
        if ( this.value === color ) return;

        var pos = this.position,
            opts = this.options;

        this.drawColorBlock( this.ctx, {
            x: pos.x + ( pos.w - opts.cbSize ) / 2,
            y: pos.sy + opts.trH + opts.spaceH
        }, color );

        this.value = color;
        this.options.onChange( color );

    },

    _onMouseDown: function( e ) {
        var me = this,
            mouse = me.getMouse( e),
            wrap = this.$palette.parent('.palette_wrap');

        if ( !mouse.isOver ) wrap.fadeOut();
        else wrap.fadeToggle();
    }
};

var Scroll = function( $canvas, ctx, pos, options ) {
    var me = new CanvasModule( this, $canvas, ctx, pos ),
        opts = me.options = $.extend( options, me.defaults );

    me.setPositionProps( opts.ordW, opts.markH + opts.spaceH + opts.handlerH+4 );

    $canvas.on({
        'mousedown': $.proxy( me._onMouseDown, me )
    });
    $( window).on({
        'mousemove': $.proxy( me._onMouseMove, me ),
        'mouseup'  : $.proxy( me._onMouseUp, me )
    });

    me.drawStatic();
    me.setValue( opts.value );

    return me;
};
Scroll.prototype = {

    defaults: {
        value: 75,
        marksCnt: 10,
        markW: 4,
        markH: 6,
        spaceH: 3,
        ordW: 96,
        ordH: 4,
        handlerW: 6,
        handlerH: 10
    },

    setValue: function( percent ) {
        if( percent > 100 ) percent = 100;
        else if( percent < 0 ) percent = 0;

        if ( this.value == percent ) return;
        this.value = percent;

        this.drawDynamic();
        this.options.onChange( percent );
    },

    drawStatic : function() {
        var ctx = this.ctx,
            opts = this.options,
            pos = this.position,

            cnt = opts.marksCnt,
            space = opts.ordW / cnt,

            sy = pos.sy,
            fy = sy + opts.markH,
            x = 0, i = 1;

        // draw Marks
        ctx.beginPath();
        for ( ; i < cnt; i++ ) {
            x = normalizeXY( pos.x + space * i );
            ctx.moveTo( x, sy );
            ctx.lineTo( x, fy );
        }
        ctx.stroke();
    },
    drawDynamic: function() {
        var ctx = this.ctx,
            opts = this.options,
            pos = this.position,
            percent = this.value,

            ow = opts.ordW,
            oh = opts.ordH,
            hw = opts.handlerW,
            hh = opts.handlerH,

            hx = normalizeXY( pos.x + ( ow - hw ) / 100 * percent ),
            hy = pos.sy + opts.markH + opts.spaceH,

            ox = normalizeXY(pos.x),
            oy = hy  + ( hh - oh ) / 2;

        ctx.clearRect( pos.x - 2,  hy-opts.spaceH/2, pos.w + 4,  pos.h );

        // draw Ord
        ctx.fillRect( ox, oy, ow, oh );
        ctx.strokeRect( ox, oy, ow, oh );

        // draw Handler
        ctx.fillRect( hx, hy, hw, hh );
        ctx.strokeRect( hx, hy, hw, hh );
    },

    _onMouseDown: function( e ) {
        var me = this,
            pos = me.position,
            cords = getMouseXY( this.$canvas, e),
            x = cords.x, y = cords.y;

        if ( x < pos.x || x > pos.x + pos.w ||
            y < pos.y - pos.w || y > pos.y + pos.w ) return;

        this.focused = true;
        this.setValue( ( x - pos.x ) / pos.w * 100 );
    },
    _onMouseMove: function( e ) {
        if( !this.focused ) return;
        var me = this,
            pos = me.position,
            cords = getMouseXY( this.$canvas, e),
            x = cords.x, y = cords.y,
            percent = 0;

        if ( x < pos.x ) percent = 0;
        else if ( x > pos.x + pos.w ) percent = 100;
        else percent = ( x - pos.x ) / pos.w * 100;

        me.setValue( percent );
    },
    _onMouseUp: function() {
        this.focused = false;
    }
};


function createCanvas( width, height ) {
    return $('<canvas width=' + width + ' height=' + height + '/>');
}

function addTitle( ctx, title, pos ) {
    pos = normalizeXY( pos );
    ctx.save()
    ctx.font = '11px Tahoma, Arial, Verdana, Sans-Serif, Lucida Sans';
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'middle';
    ctx.beginPath();
    ctx.fillText( title, pos.x, pos.y );
    ctx.closePath();
    var w = ctx.measureText( title ).width;
    ctx.restore();
    return w;
}

function getMouseXY( $canvas, e ) {
    var pos = $canvas.offset(),
        x = e.pageX - pos.left,
        y = e.pageY - pos.top;
    return { x: x, y: y };
}

function normalizeXY( cords ) {
    if ( $.isNumeric( cords ) ) {
        return parseInt(cords.toFixed(0)) + .5;
    }

    var x = 0, y = 0;
    if ( $.isArray( cords ) ) {
        x = cords[0];
        y = cords[1];
    }
    else if ( cords.x ) {
        x = cords.x;
        y = cords.y;
    }

    return {
        x: parseInt(x.toFixed(0)) + .5,
        y: parseInt(y.toFixed(0)) + .5
    };
}

function touchHandler( event ) {
    event = event.originalEvent;
    var touches = event.changedTouches,
        first = touches[0],
        type = "";

    switch(event.type) {
        case "touchstart": type = "mousedown"; break;
        case "touchmove":  type = "mousemove"; break;
        case "touchend":   type = "mouseup"; break;
        default: return;
    }

    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1,
        first.screenX, first.screenY,
        first.clientX, first.clientY, false,
        false, false, false, 0/*left*/, null);

    first.target.dispatchEvent( simulatedEvent );
    event.preventDefault();
}


$(function () {
    $(window).on('touchstart touchmove touchend', touchHandler);
    $('canvas').on('touchstart touchmove touchend', touchHandler);
    new Canvas( $(".graffit")[0] );
});

