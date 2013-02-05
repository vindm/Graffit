"use strict"


function Canvas( elem, options ) {
    var me = this;

    me.$elem = $( elem );
    me.options = $.extend( me.defaults, options );

    me.brush = me.options.brush;
    me.down = false;
    me.path = [];
    me.pathLength = 0;

    me.addCanvas();
    me.addControls();
    me.build();

    me.onBrushChanged();
}
Canvas.prototype = {

    defaults: {
        width: 800,
        height: 600,
        cpHeight: 64,
        brush: {
            size: 6,
            minSize: .1,
            maxSize: 25,
            opacity: .75,
            minOpacity:.01,
            maxOpacity: 1,
            color: 'black'
        },
        controls: {
            space: 10
        }
    },

    addCanvas: function() {
        var me = this,
            $elem = me.$elem,
            opts = me.options,

            $canvas = createCanvas( opts.width, opts.height ),
            ctx = $canvas[0].getContext('2d'),
            $fake = $canvas.clone(),
            fakeCtx = $fake[0].getContext('2d');

        ctx.lineCap = ctx.lineJoin =
            fakeCtx.lineCap = fakeCtx.lineJoin = "round";

        me.$canvas = $canvas;
        me.ctx = ctx;

        me.$fake = $fake;
        me.fakeCtx = fakeCtx;

        $fake.on('mousedown click', $.proxy( me.handleDraw, me ));
        $(window).on('mousemove mouseup', $.proxy( me.handleDraw, me ));

    },
    addControls: function( ) {
        var me = this,
            opts = this.options,
            brush = opts.brush;

        var $canvas = createCanvas( opts.width, opts.cpHeight),
            ctx = $canvas[0].getContext('2d');

        ctx.font = '11px tahoma, arial, verdana, sans-serif, Lucida Sans;';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#E4E4E4';
        ctx.strokeStyle = '#BFBFBF';
        ctx.lineWidth = 0.5;
        ctx.save();

        me.$cp = $canvas;
        me.$cpCtx = ctx;

        var space = opts.controls.space,
            ctrlPosition = { x: space - .5, y: opts.cpHeight/2 - .5 };

        var colorPicker = new ColorPicker( $canvas, ctx, ctrlPosition, {
            onChange: function( color ) {
                me.brush.color = color;
                me.onBrushChanged();
            }
        });
        me.$paletteCanvas = colorPicker.$palette;
        me.$paletteCtx = colorPicker.$paletteCtx;
        ctrlPosition.x += colorPicker.position.w + space;

        var sizeScroll = new Scroll( $canvas, ctx, ctrlPosition, {
            onChange: function( percent ) {
                var val = ( brush.maxSize - brush.minSize ) / 100 * percent + brush.minSize;
                me.brush.size = val;
                me.onBrushChanged();
            }
        });

        ctrlPosition.x += sizeScroll.position.w + space;

        var opacityScroll = new Scroll( $canvas, ctx, ctrlPosition, {
            onChange: function( percent ) {
                var val = ( brush.maxOpacity - brush.minOpacity ) / 100 * percent + brush.minOpacity;
                me.brush.opacity = val;
                me.onBrushChanged();
            }
        });


        ctrlPosition.x += sizeScroll.position.w + space;


    },
    build: function() {
        var me = this, opts = me.options,
            $elem = me.$elem,
            $canvas = me.$canvas,
            $fake = me.$fake,
            $cp = me.$cp,
            $palette = me.$paletteCanvas;

        var w = opts.width, h = opts.height + opts.cpHeight;
        $elem.css({
            width: w, height: h,
            marginLeft: -w/2, marginTop: -h/2
        });

        $elem.append(
            $('<div/>', { 'class': 'wrap', 'width': w, 'height': opts.height }).append(
                $canvas.addClass('main'),
                $fake.addClass('fake')
            ),
            $('<div/>', { 'class': 'toolbar', 'width': w, 'height': opts.cpHeight }).append(
                $cp.addClass('cp'),
                $palette.addClass('palette')
            )
        );

        var offset = $canvas.offset();
        me.position = {
            'x': offset.left,  'y': offset.top,
            'w': $canvas.width(),'h': $canvas.height()
        };
    },

    onBrushChanged: function() {
        var brush = this.brush;
        [ this.ctx, this.fakeCtx ].forEach(function( ctx, i ) {
            ctx.strokeStyle = ctx.fillStyle = brush.color;
            ctx.lineWidth = brush.size * 2;
            //ctx.globalAlpha = brush.opacity;
            ctx.save();
        });
        //this.$fake.css('opacity', brush.opacity );
    },

    handleDraw: function( e ) {
        var path = getCursorPosition( this.$canvas, e );

        switch ( e.type ) {

            case 'mousedown':
                this.down = true;
                this.path.x = [ path.x ];
                this.path.y = [ path.y ];
                this.draw( this.fakeCtx );
            break;

            case 'mousemove':
                if ( !this.down ) return;
                if( this.path.x == path.x && this.path.y == path.y) return;

                this.fakeCtx.clearRect( 0, 0, this.options.width, this.options.height );
                this.path.x.push( path.x );
                this.path.y.push( path.y );
                this.draw( this.fakeCtx );

            break;

            case 'mouseup':
                if ( !this.down ) return;
                this.down = false;
                this.fakeCtx.clearRect( 0, 0, this.options.width, this.options.height );
                this.path.x.push( path.x );
                this.path.y.push( path.y );
                this.draw( this.fakeCtx );

            break;
        }

    },

    draw: function( ctx ) {
        var me = this,
            path = me.path,
            x = path.x, y = path.y,
            lenX = x.length;

        ctx.beginPath();
        ctx.moveTo( x[0], y[0] );

        if ( lenX < 2 ) {
            ctx.lineTo( x[0] + .51, y[0] );
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
    }
};


var Scroll = function( $canvas, ctx, pos, options ) {
    var me = this,
        opts = me.options = $.extend( options, me.defaults );

    me.$canvas = $canvas;
    me.ctx = ctx;
    me.position = {
        x: pos.x, y: pos.y,
        w: opts.ordW,
        h: opts.markH + opts.spaceH + opts.handlerH
    };

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
        markH: 5,
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

            sy = pos.y - pos.h/2 - opts.spaceH,
            fy = sy + opts.markH,
            x = 0, i = 1;

        // draw Marks
        ctx.beginPath();
        for ( ; i < cnt; i++ ) {
            x = pos.x + space * i;
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
            ox = pos.x,
            oy = pos.y - oh/2,

            hw = opts.handlerW,
            hh = opts.handlerH,
            hx = ( pos.x + ( ow - hw ) / 100 * percent ).toFixed(0)-.5,
            hy = pos.y - hh / 2;

        ctx.clearRect( pos.x - 2,  hy-opts.spaceH/2, pos.w + 4,  hy + opts.handlerH + opts.spaceH/2 );

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
            cords = getCursorPosition( this.$canvas, e),
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
            cords = getCursorPosition( this.$canvas, e),
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


var ColorPicker = function( $canvas, ctx, pos, options ) {
    var me = this,
        opts = me.options = $.extend( options, me.defaults );

    me.$canvas = $canvas;
    me.ctx = ctx;
    me.position = {
        x: pos.x, y: pos.y,
        w: opts.trW,
        h: opts.trH + opts.spaceH + opts.cbSize
    };

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
        blMargin: .0,
        colorStep: 51,
        trW: 14,
        trH: 5,
        spaceH: 2
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


        for ( var b=0; b < 6; b++ ) { // blocks
            for ( var r = 0; r < 6; r++ ) { // rows

                cur_y = size * r + blMargin;
                if ( b > 2 ) cur_y += size * 6;

                for ( var c=0 ; c < 6; c++ ) { // columns
                    cur_x = size * c + blMargin;
                    cur_x += b > 2 ? size * 6 * ( b - 3 ) : size * 6 * b;

                    color = "rgb(" + step * b + ", " + step * c + ", " + step * r + ")";
                    me.drawColorBlock( pCtx, { x: cur_x, y: cur_y}, color, 'rgb(0,0,0)' );
                }
            }
        }

        var prevHover = null;
        $palette.on({
            mousedown: function( e ) {
                var cords = getCursorPosition( $palette, e );
                me.setValue( me.getColor( cords ) );
            },
            mousemove: function ( e ) {
                var cords = getCursorPosition( $palette, e),
                    color = me.getColor( cords );

                if ( cords.x >= size * 18 || cords.y >= size * 12 ) return;

                cords.x -= cords.x % size - blMargin;
                cords.y -= cords.y % size - blMargin;

                if ( prevHover ) {
                    if ( prevHover.cords == cords ) return;
                    me.drawColorBlock( pCtx, prevHover.cords, prevHover.color, 'black' );
                }

                prevHover = { cords: cords, color: color };
                me.drawColorBlock( pCtx, cords, color, 'white');
            }
        })

        me.$palette = $palette;
        me.paletteCtx = pCtx;

    },

    drawTriangle: function( hover ) {
        var ctx = this.ctx,
            pos = this.position,
            opts = this.options,
            sy = pos.y - pos.h / 2;

        ctx.save();
        ctx.clearRect( pos.x, sy, opts.trW, opts.trH );
        if ( hover ) ctx.fillStyle = 'white';

        ctx.beginPath();
        ctx.moveTo( pos.x + pos.w / 2, sy );
        ctx.lineTo( pos.x + pos.w, sy + opts.trH );
        ctx.lineTo( pos.x, sy + opts.trH );
        ctx.lineTo( pos.x + pos.w / 2, sy);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    },
    drawColorBlock: function( ctx, pos, fill, stroke ) {
        var opts = this.options,
            size = opts.cbSize;

        ctx.save();

        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke || fill;
        fill && ctx.fillRect( pos.x, pos.y, size, size );
        stroke && ctx.strokeRect( pos.x, pos.y, size, size );

        ctx.restore();
    },

    setValue: function( color ) {
        if ( this.value === color ) return;

        var pos = this.position,
            opts = this.options;
        this.drawColorBlock( this.ctx, {
            x: pos.x + ( pos.w - opts.cbSize ) / 2,
            y: pos.y - pos.h/2 + opts.trH + opts.spaceH
        }, color );

        this.value = color;
        this.options.onChange( color );

    },

    getColor: function( cords ) {
        var opts = this.options,
            size = opts.cbSize,
            step = opts.colorStep,

            c = ( cords.x - cords.x % size ) / size,
            r = ( cords.y - cords.y % size ) / size,
            b = ( c - c % 6 ) / 6 + ( r - r % 6 ) / 2;

        return 'rgb('+[
            step * b,
            step * ( c - b % 3 * 6 ),
            step * ( r - ( b - b % 3 ) / 3 * 6 )
        ].join(',')+')';
    },

    _onMouseDown: function( e ) {
        var me = this,
            pos = me.position,
            cords = getCursorPosition( this.$canvas, e ),
            x = cords.x, y = cords.y;

        if ( x < pos.x || x > pos.x + pos.w || y < pos.y - pos.w || y > pos.y + pos.w ) {
            this.$palette.slideUp();
        } else this.$palette.slideToggle();
    }
};



function createCanvas( width, height ) {
    return $('<canvas width=' + width + ' height=' + height + '/>');
}
function getCursorPosition( $canvas, e ) {
    var pos = $canvas.offset(),
        x = e.pageX - pos.left,
        y = e.pageY - pos.top;
    return { x: x, y: y };
}
function touchHandler (event) {
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
    new Canvas( $(".graffit")[0] );
});

