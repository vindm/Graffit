
/**
 * Created with JetBrains WebStorm.
 * User: vindm
 * Date: 26.09.12
 * Time: 3:48
 * To change this template use File | Settings | File Templates.
 */



Event = (function() {
    var guid = 0;

    function fixEvent( event ) { // кросс-браузерная предобработка объекта-события
        event = event || window.event;

        if ( event.isFixed ) {
            return event;
        }
        event.isFixed = true;

        event.preventDefault = event.preventDefault || function () { this.returnValue = false; }
        event.stopPropagation = event.stopPropagation || function () { this.cancelBubble = true; }

        if ( !event.target ) event.target = event.srcElement;

        if ( !event.relatedTarget && event.fromElement )
            event.relatedTarget = event.fromElement == event.target ? event.toElement: event.fromElement;

        if ( event.pageX == null && event.clientX != null ) {
            var html = document.documentElement, body = document.body;
            event.pageX = event.clientX + ( html && html.scrollLeft || body && body.scrollLeft || 0 ) - ( html.clientLeft || 0 );
            event.pageY = event.clientY + ( html && html.scrollTop || body && body.scrollTop || 0 ) - ( html.clientTop || 0 );
        }

        if ( !event.which && event.button )
            event.which = ( event.button & 1 ? 1 : ( event.button & 2 ? 3 : ( event.button & 4 ? 2 : 0) ));

        return event;
    }

    function commonHandle( event ) { // вспомогательный универсальный обработчик

        event = fixEvent(event);

        var handlers = this.events[event.type];

        for( var g in handlers ) {
            var ret = handlers[g].call( this, event );
            if( ret === false ) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    return {
        add: function(elem, type, handler) {

            if ( elem.setInterval && ( elem != window && !elem.frameElement ) ) {
                elem = window;
            }

            if ( !handler.guid ) {
                handler.guid = ++guid;
            }

            if( !elem.events ) {
                elem.events = {};
                elem.handle = function( event ) {
                    if( typeof Event !== 'undefined' ) {
                        return commonHandle.call(elem, event);
                    }
                }
            }

            if( !elem.events[type]) {
                elem.events[type] = {};

                if( elem.addEventListener )
                    elem.addEventListener( type, elem.handle, false );

                else if ( elem.attachEvent )
                    elem.attachEvent( 'on' + type, elem.handle, false );
            }

            elem.events[type][handler.guid] = handler;

        },
        remove: function( elem, type, handler ) {
            var handlers = elem.events && elem.events[type];
            if( !handlers) return;

            delete handlers[handler.guid];

            for (var any in handlers ) return;

            if( elem.removeEventListener )
                elem.removeEventListener(type, elem.handle, false);
            else if ( elem.detachEvent )
                elem.detachEvent('on' + type, elem.handle);

            delete elem.events[type];

            for (var any in elem.events ) return;
            try {
                delete elem.handle;
                delete elem.events;
            } catch(e) {
                elem.removeAttribute('handle');
                elem.removeAttriibute('events');
            }
        }
    }
}());
(function( window ) {
    console.log('$')
    $ = function ( selector, context ) {
        return new Joo ( selector, context);
    }

    function bindReady ( handler ) {
        var called = false;

        function ready() {
            if( called ) return;
            called = true;
            handler();
        }

        if( document.addEventListener )
            document.addEventListener( 'DOMContentLoaded', function() {
                ready();
            }, false);
        else if ( document.attachEvent ) {

            if ( document.documentElement.doScroll && window == window.top  ) {
                function tryScroll () {
                    if( called ) return;
                    if( !document.body ) return;
                    try {
                        document.doumentElement.doScroll('left');
                        ready();
                    } catch (e) {
                        setTimeout( tryScroll, 0);
                    }
                }
                tryScroll();
            }

            document.attachEvent('onreadystatechange', function() {
                if( document.readyState === 'complete') ready();
            })
        }

        if( window.addEventListener )
            window.addEventListener('load', ready, false );
        else if ( window.attachEvent )
            window.attachEvent('onload', ready)
    }

    function Joo ( selector, context ) {
        this.length = 0;
        this.bind = function(type, handler) {
            if ( typeof this.el == 'array' ) {
                this.el.forEach(function(elem) {
                    Event.add( elem, type, handler );
                })
            } else {
                Event.add(this.el, type, handler);
            }
        }
        this.unbind = function(type, handler) {
            if ( typeof this.el == 'array' ) {
                this.el.forEach(function(elem) {
                    Event.remove( elem, type, handler );
                })
            } else {
                Event.remove(this.el, type, handler);
            }
        }
        if( !selector ) {
            this.el = [];
            return this;
        }
        if( selector === 'body' && !context && document.body ) {
            this.selector = selector;
            this.context = document;
            this.el = document.body;
            this.length = 1;
            return this;
        } else if ( selector.nodeType ) {
            this.context = this.el = selector;
            this.length = 1;
            return this;
        } else if ( typeof selector === 'string' ) {
            this.context = context || document;
            this.selector = selector;
            this.el = Sizzle( selector, this.context );
            this.length = this.el.length;
            if( this.length == 1 )
                this.el = this.el[0];
            return this;
        } else if ( typeof selector == 'function' ) {
            bindReady( selector );
        }
        else return null;
    }
})(window);