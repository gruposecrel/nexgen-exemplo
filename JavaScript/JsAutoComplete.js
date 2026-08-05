//85659 - Camilo Henrique em 06/02/2026
(function() {

  /*
   * ======================================================
   * CSS
   * ======================================================
   */
  const css = `
  .autocomplete-results{
	  position:absolute;
	  border:1px solid #ccc;
	  background:#fff;
	  height:150px;
	  max-height:200px;
	  overflow-y:auto;
      overflow-x:hidden; 
	  z-index:9999;
	  box-shadow:0 2px 4px rgba(0,0,0,.2);
	  display:none;
	}

	/* ITEM */
	.autocomplete-item{
	  padding:8px;
	  border-bottom:1px solid #eee;
	  transition: background-color .25s ease, transform .2s ease;
	}

	/* Hover no container */
	.autocomplete-item:hover{
	  background:#f7f7f7;
	  transform: translateX(2px);
	}

	/* SPANS */
	.autocomplete-item span{
	  display:block;
	  cursor:pointer;
	  padding:3px 0;
	  transition: color .25s ease, text-decoration-color .25s ease;
	  background-color: transparent !important;
	}

	/* VALUE */
	.autocomplete-item .ac-value{
	  font-weight:bold;
	  color:#444;
	  text-decoration: underline wavy transparent 1px;
	}

	/* LABEL */
	.autocomplete-item .ac-label{
	  color:#222;
	  text-decoration: underline wavy transparent 1px;
	}

	/* Hover individual */
	.autocomplete-item .ac-value:hover,
	.autocomplete-item .ac-label:hover{
	  text-decoration-color:#0d6efd;
	}

	/* Scrollbar */
	.autocomplete-results::-webkit-scrollbar-track {
	  background-color:#F4F4F4;
	}

	.autocomplete-results::-webkit-scrollbar {
	  width:6px;
	  background:#F4F4F4;
	}

	.autocomplete-results::-webkit-scrollbar-thumb {
	  background:#dad7d7;
	  border-radius:4px;
	}
`;

  const style = document.createElement("style");
  style.innerHTML = css;
  document.head.appendChild(style);

  /*
   * ======================================================
   * COMPONENTE
   * ======================================================
   */

  function AutoCompleteDescProduto(config) {

    const defaults = {
      inputId: null,
      apiUrl: null,
      minChars: 3,
      delay: 300,
      pageSize: 20,
      isQueryString: true,
      params: {},
      mapResult: null,

      onSelectValue: null,
      onSelectLabel: null
    };

    this.options = Object.assign({}, defaults, config);

    if (!this.options.inputId || !this.options.apiUrl) {
      console.error("inputId e apiUrl são obrigatórios");
      return;
    }

    this.input = document.getElementById(this.options.inputId);
    if (!this.input) return;

    this.resultsDiv = document.createElement("div");
    this.resultsDiv.className = "autocomplete-results";
    document.body.appendChild(this.resultsDiv);

    this.page = 1;
    this.hasMore = true;
    this.loading = false;
    this.lastTerm = "";
    this.timer = null;
    this.currentRequest = null;

    this.init();
  }

  /*
   * ======================================================
   * INIT
   * ======================================================
   */
  AutoCompleteDescProduto.prototype.init = function() {

    const self = this;

    this.input.addEventListener("input", function() {

      clearTimeout(self.timer);

      const term = self.input.value.trim();

      if (term.length < self.options.minChars) {
        self.hide();
        return;
      }

      self.timer = setTimeout(function() {
        self.page = 1;
        self.hasMore = true;
        self.lastTerm = term;
        self.resultsDiv.innerHTML = "";
        self.search(term);
      }, self.options.delay);
    });

    this.resultsDiv.addEventListener("scroll", function() {

      if (!self.hasMore || self.loading) return;

      if (self.resultsDiv.scrollTop + self.resultsDiv.clientHeight >=
          self.resultsDiv.scrollHeight - 5) {

        self.page++;
        self.search(self.lastTerm);
      }
    });

    document.addEventListener("click", function(e) {
      if (!self.input.contains(e.target) &&
          !self.resultsDiv.contains(e.target)) {
        self.hide();
      }
    });
  };

  /*
   * ======================================================
   * POSITION
   * ======================================================
   */
  AutoCompleteDescProduto.prototype.position = function() {

    const rect = this.input.getBoundingClientRect();

    this.resultsDiv.style.width = rect.width + "px";
    this.resultsDiv.style.left = rect.left + window.scrollX + "px";
    this.resultsDiv.style.top  = rect.bottom + window.scrollY + "px";
  };

  /*
   * ======================================================
   * SEARCH (jQuery AJAX)
   * ======================================================
   */
  AutoCompleteDescProduto.prototype.search = function(term) {

    if (!this.hasMore) return;

    const self = this;

    this.loading = true;
    this.position();

    if (this.currentRequest) {
      this.currentRequest.abort();
    }

    let url = this.options.apiUrl.replace(/\/servlet\//gi, "/");

    if (this.options.isQueryString) {

    const params = typeof this.options.params === "function"
    		  ? this.options.params()
    		  : $.extend({}, this.options.params);

      params.busca  = term;
      params.pagina = this.page;
      params.qtdPag = params.qtdPag || this.options.pageSize;

      url += (url.indexOf("?") >= 0 ? "&" : "?") + $.param(params);
    }

    this.currentRequest = $.ajax({
      url: url,
      method: "GET",
      dataType: "json",

      success: function(json) {
    	  
        if (json && json.error) { 
        	console.error("API:", json.error);
        	self.hasMore = false; 
	        
        	if (self.page === 1) {
	        	self.showEmpty(); 
	        }	
        	return;
        }
        
        const items = json && (json.items || json);

        if (!items || Object.keys(items).length === 0) {

          self.hasMore = false;

          if (self.page === 1) {
            self.showEmpty();
          } else if (!self.resultsDiv.querySelector(".fim-resultados")) {

            const end = document.createElement("div");
            end.className = "autocomplete-item fim-resultados";
            end.style.textAlign = "center";
            end.innerHTML = "Fim dos resultados";
            self.resultsDiv.appendChild(end);
          }

          return;
        }

        const list = Array.isArray(items)
          ? items
          : Object.entries(items);

        list.forEach(function(item) {

          const mapped = self.options.mapResult
            ? self.options.mapResult(item)
            : { value: item[0], label: item[1] };

          const div = document.createElement("div");
          div.className = "autocomplete-item";

          const spanValue = document.createElement("span");
          spanValue.className = "ac-value";
          spanValue.innerHTML = mapped.value;

          const spanLabel = document.createElement("span");
          spanLabel.className = "ac-label";
          spanLabel.innerHTML = mapped.label;

          spanValue.onclick = function() {
            self.selectItemValue(mapped);
          };

          spanLabel.onclick = function() {
            self.selectItemLabel(mapped);
          };

          div.appendChild(spanValue);
          div.appendChild(spanLabel);
          self.resultsDiv.appendChild(div);
        });

        self.resultsDiv.style.display = "block";
      },

      error: function(xhr, status) {

        if (status === "abort") return;

        console.error("Erro autocomplete:", xhr.responseText);

        if (self.page === 1) {
          self.showEmpty();
        }
      },

      complete: function() {
        self.loading = false;
      }
    });
  };

  /*
   * ======================================================
   * SELECT VALUE
   * ======================================================
   */
  AutoCompleteDescProduto.prototype.selectItemValue = function(item) {

	this.hide();
    if (this.options.onSelectValue) {
      this.options.onSelectValue(item);
    }
    
    if (document.createEvent) {
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("change", true, false);
        this.input.dispatchEvent(evt);
      } else if (this.input.fireEvent) {
        this.input.fireEvent("onchange");
      }
  };

  /*
   * ======================================================
   * SELECT LABEL
   * ======================================================
   */
  AutoCompleteDescProduto.prototype.selectItemLabel = function(item) {

    this.input.value = item.label;
    this.hide();

    if (this.options.onSelectLabel) {
      this.options.onSelectLabel(item);
    }

    if (document.createEvent) {
      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("change", true, false);
      this.input.dispatchEvent(evt);
    } else if (this.input.fireEvent) {
      this.input.fireEvent("onchange");
    }
  };

  /*
   * ======================================================
   * HELPERS
   * ======================================================
   */
  AutoCompleteDescProduto.prototype.hide = function() {
    this.resultsDiv.style.display = "none";
  };

  AutoCompleteDescProduto.prototype.showEmpty = function() {

    this.resultsDiv.innerHTML =
      '<div class="autocomplete-item">Nenhum resultado encontrado</div>';

    this.resultsDiv.style.display = "block";
  };

  /*
   * ======================================================
   * FACTORY
   * ======================================================
   */
  window.criarAutoCompleteDescProduto = function(config) {
    return new AutoCompleteDescProduto(config);
  };

})();