(function(window) {

  var haveLocalStorage;
  var LS_STATE_KEY = "remotestorage:widget:state";
  function stateSetter(widget, state) {
    return function() {
      if(haveLocalStorage) {
        localStorage[LS_STATE_KEY] = state;
      }
      if(widget.view) {
        if(widget.rs.remote) {
          widget.view.setUserAddress(widget.rs.remote.userAddress);
        }
        widget.view.setState(state, arguments);
      }
    };
  }
  function errorsHandler(widget){
    //decided to not store error state
    return function(error){
      if(error[0] == 'discovery failed'){
        widget.view.setState('initial', [error[1]]);        
      } else {
        widget.view.setState('error', arguments);
      }
    }
  }
  RemoteStorage.Widget = function(remoteStorage) {
    this.rs = remoteStorage;
    this.rs.on('ready', stateSetter(this, 'connected'));
    this.rs.on('disconnected', stateSetter(this, 'initial'));
    //this.rs.on('connecting', stateSetter(this, 'connecting'))
    this.rs.on('authing', stateSetter(this, 'authing'));
    this.rs.on('sync-busy', stateSetter(this, 'busy'));
    this.rs.on('sync-done', stateSetter(this, 'connected'));
    this.rs.on('error', errorsHandler(this) );
    if(haveLocalStorage) {
      var state = localStorage[LS_STATE_KEY] = state;
      if(state) {
        this._rememberedState = state;
      }
    }
  };

  RemoteStorage.Widget.prototype = {
    display: function() {
      if(! this.view) {
        this.setView(new View());
      }
      this.view.display.apply(this.view, arguments);
      return this;
    },

    setView: function(view) {
      this.view = view;
      this.view.on('connect', this.rs.connect.bind(this.rs));
      this.view.on('disconnect', this.rs.disconnect.bind(this.rs));
      this.view.on('sync', this.rs.sync.bind(this.rs));
      if(this._rememberedState) {
        stateSetter(this, this._rememberedState)();
        delete this._rememberedState;
      }
    }
  };

  RemoteStorage.prototype.displayWidget = function() {
    this.widget.display();
  };

  RemoteStorage.Widget._rs_init = function(remoteStorage) {
    remoteStorage.widget = new RemoteStorage.Widget(remoteStorage);
  };

  RemoteStorage.Widget._rs_supported = function(remoteStorage) {
    haveLocalStorage = 'localStorage' in window;
    return true;
  };
var cEl = document.createElement.bind(document);

  function gCl(parent, className) {
    return parent.getElementsByClassName(className)[0];
  }
  function gTl(parent, className) {
    return parent.getElementsByTagName(className)[0];
  }
    
  function show(el, display) {
    if(typeof(display) === 'undefined') {
      display = 'block';
    }
    el.style.display = display;
    return el;
  }

  function hide(el) {
    show(el,'none');
    return el;
  }

  function removeClass(el, className) {
    return el.classList.remove(className);
  }

  function addClass(el, className) {
    return el.classList.add(className);
  }


  function View() {
    if(typeof(document) === 'undefined') {
      throw "Widget not supported";
    }
    RemoteStorage.eventHandling(this,
                                'connect',
                                'disconnect',
                                'sync',
                                'reconnect',
                                'display');

    this.display = function() {
      function toggle_bubble(event) {
        if(bubble.className.search('hidden') < 0) {
          hide_bubble(event);
        } else {
          show_bubble(event);
        }
      }
      
      function hide_bubble(){
        //console.log('hide bubble',bubble);
        addClass(bubble, 'hidden')
        document.body.removeEventListener('click', hide_bubble_on_body_click);
      }

      function hide_bubble_on_body_click(event) {
        for(var p = event.target; p != document.body; p = p.parentElement) {
          if(p.id == 'remotestorage-widget') {
            return;
          }
        }
        hide_bubble();
      }

      function show_bubble(event){
        //console.log('show bubble',bubble,event)
        removeClass(bubble, 'hidden');
        if(typeof(event) != 'undefined') {
          stop_propagation(event);
        }
        document.body.addEventListener('click', hide_bubble_on_body_click);
        gTl(bubble,'form').userAddress.focus();
      }

      function stop_propagation(event) {
        if(typeof(event.stopPropagation) == 'function') {
          event.stopPropagation();
        } else {
          event.cancelBubble = true;
        }
      }

      if(typeof(this.widget) !== 'undefined')
        return this.widget;

      var element = cEl('div');
      var style = cEl('style');
      style.innerHTML = RemoteStorage.Assets.widgetCss;

      element.id = "remotestorage-widget";

      element.innerHTML = RemoteStorage.Assets.widget;


      element.appendChild(style);
      document.body.appendChild(element);

      var el;
      //sync button
      el = gCl(element, 'sync');
      gTl(el, 'img').src = RemoteStorage.Assets.syncIcon;
      el.addEventListener('click', this.events.sync.bind(this));

      //disconnect button
      el = gCl(element, 'disconnect');
      gTl(el, 'img').src = RemoteStorage.Assets.disconnectIcon;
      el.addEventListener('click', this.events.disconnect.bind(this));

      //connect button
      var cb = gCl(element,'connect');
      gTl(cb, 'img').src = RemoteStorage.Assets.connectIcon;
      cb.addEventListener('click', this.events.connect.bind(this));

      // input
      el = gTl(element, 'form').userAddress;
      el.addEventListener('keyup', function(event) {
        if(event.target.value) cb.removeAttribute('disabled');
        else cb.setAttribute('disabled','disabled');
      });
      if(this.userAddress) {
        el.value = this.userAddress;
      }
     
      //the cube
      el = gCl(element, 'cube');
      el.src = RemoteStorage.Assets.remoteStorageIcon;
      el.addEventListener('click', toggle_bubble);
      
      //the bubble
      var bubble = gCl(element,'bubble');
      var bubbleDontCatch = { INPUT: true, BUTTON: true, IMG: true };
      bubble.addEventListener('click', function(event) {
        if(! bubbleDontCatch[event.target.tagName]) {
          show_bubble(event);
        }
      })
      hide_bubble();

      this.div = element;

      this.states.initial.call(this);
      this._emit('display');
      return this.div;
    };

    this.setState = function(state, args) {
      //console.log('setState(',state,',',args,');');
      var s = this.states[state];
      if(typeof(s) === 'undefined') {
        throw new Error("Bad State assigned to view: " + state);
      }
      s.apply(this,args);
    };

    this.setUserAddress = function(addr) {
      this.userAddress = addr;

      var el;
      if(this.div && (el = gTl(this.div, 'form').userAddress)) {
        el.value = this.userAddress;
      }
    };
  }

  View.prototype = {
    // States:
    //  initial      - not connected
    //  authing      - in auth flow
    //  connected    - connected to remote storage, not syncing at the moment
    //  busy         - connected, syncing at the moment
    //  offline      - connected, but no network connectivity
    //  error        - connected, but sync error happened
    //  unauthorized - connected, but request returned 401
    currentState : 'initial',
    states :  {
      initial : function(message) {
        var cube = gCl(this.div, 'cube');
        var bubble = this.div.querySelector('.bubble');
        var info = message || 'This app allows you to use your own storage! Find more info on <a href="http://remotestorage.io/" target="_blank">remotestorage.io';
        if(message) {
          cube.src = RemoteStorage.Assets.remoteStorageIconError;
          removeClass(cube, 'remotestorage-loading');
          bubble.classList.remove('hidden');
          setTimeout(function(){
            cube.src = RemoteStorage.Assets.remoteStorageIcon;
          },3512)
        } else {
          if(! bubble.classList.contains('hidden')) {
            bubble.classList.add('hidden');
          }
        }
        this.div.className = "remotestorage-state-initial";
        gCl(this.div, 'status-text').innerHTML = "Connect <strong>remotestorage</strong>";
        var infoEl = gCl(this.div, 'info');
        infoEl.innerHTML = info;

        if(message) {
          infoEl.classList.add('remotestorage-error-info');
        } else {
          infoEl.classList.remove('remotestorage-error-info');
        }
        
      },
      authing : function() {
        this.div.className = "remotestorage-state-authing";
        gCl(this.div, 'status-text').innerHTML = "Connecting";
        addClass(gCl(this.div, 'cube'), 'remotestorage-loading'); //TODO needs to be undone when is that neccesary
      },
      connected : function() {
        this.div.className = "remotestorage-state-connected";
        gCl(this.div, 'userAddress').innerHTML = this.userAddress;
        var cube = gCl(this.div, 'cube');
        cube.src = RemoteStorage.Assets.remoteStorageIcon;
        removeClass(cube, 'remotestorage-loading');
      },
      busy : function() {
        this.div.className = "remotestorage-state-busy";
        addClass(gCl(this.div, 'cube'), 'remotestorage-loading'); //TODO needs to be undone when is that neccesary
      },
      offline : function() {
        this.div.className = "remotestorage-state-offline";
        gCl(this.div, 'cube').src = RemoteStorage.Assets.remoteStorageIconOffline;
      },
      error : function(err) {
        this.div.className = "remotestorage-state-error";
        
        gCl(this.div, 'bubble-text').innerHTML = 'ERROR'
        gCl(this.div, 'error-msg').innerHTML = err;
        
        gCl(this.div, 'cube').src = RemoteStorage.Assets.remoteStorageIconError;
      },
      unauthorized : function() {
        this.div.className = "remotestorage-state-unauthorized";
      }
    },
    events : {
      connect : function(event) {
        event.preventDefault();
        this._emit('connect', gTl(this.div, 'form').userAddress.value);
      },
      sync : function(event) {
        event.preventDefault();
        this._emit('sync');
      },
      disconnect : function(event) {
        event.preventDefault();
        this._emit('disconnect');
      },
      // FIXME: what are these???
      reconnect : function() {},
      display : function() {}
    }
  };

  
})(this);
