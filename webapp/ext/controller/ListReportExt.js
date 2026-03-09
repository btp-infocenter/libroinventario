sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/CheckBox",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/Text",
    "sap/ui/core/BusyIndicator"
], function(MessageToast, MessageBox, Dialog, Button, CheckBox, VBox, Label, Text, BusyIndicator) {
    'use strict';

    // Configuración de sociedades
    var mCompanyConfig = {
        "1001": { nombre: "CONSORCIO JGL CASATUA", ruc: "80120839-4" },
        "1002": { nombre: "Casatua Real Estate", ruc: "80138886-4" },
        "1003": { nombre: "Casatua Hospitality", ruc: "80133283-4" },
        "1004": { nombre: "MET Las Lomas S.A.", ruc: "80108863-1" },
        "1005": { nombre: "Artemio S.A.", ruc: "80135248-7" },
        "1006": { nombre: "Casa M S.A.", ruc: "80116553-9" },
        "1007": { nombre: "Matter S.A.", ruc: "80135246-0" },
        "1008": { nombre: "MET del Sol S.A.", ruc: "80144997-9" },
        "1009": { nombre: "Cosmopolitan I S.A.", ruc: "80132676-1" },
        "1010": { nombre: "Casa Grande S.A.", ruc: "80144998-7" }
    };

    /**
     * Verifica si se aplicaron los filtros (botón Go)
     */
    function isDataLoaded(oTable) {
        if (!oTable) {
            return false;
        }
        var oBinding = oTable.getBinding("rows");
        if (!oBinding) {
            return false;
        }
        var iLength = oBinding.getLength();
        return iLength > 0;
    }

    /**
     * Expande todos los nodos usando el botón estándar de Fiori Elements
     */
    function expandAllNodes(oTable) {
        return new Promise(function(resolve) {
            if (!oTable) {
                resolve();
                return;
            }
            
            // Buscar el botón de "Expand All" de Fiori Elements
            var oExpandButton = null;
            
            // Método 1: Buscar por ID que contenga "ExpandAll"
            var aButtons = sap.ui.core.Element.registry.filter(function(oElement) {
                if (oElement.isA && oElement.isA("sap.m.Button")) {
                    var sId = oElement.getId() || "";
                    // El botón de expandir todo suele tener "ExpandAll" o "expandAll" en el ID
                    if (sId.indexOf("ExpandAll") >= 0 || sId.indexOf("expandAll") >= 0) {
                        return true;
                    }
                }
                return false;
            });
            
            if (aButtons.length > 0) {
                oExpandButton = aButtons[0];
                console.log("Botón ExpandAll encontrado por ID:", oExpandButton.getId());
            }
            
            // Método 2: Buscar por icono si no se encontró por ID
            if (!oExpandButton) {
                aButtons = sap.ui.core.Element.registry.filter(function(oElement) {
                    if (oElement.isA && oElement.isA("sap.m.Button")) {
                        var sIcon = oElement.getIcon ? oElement.getIcon() : "";
                        // El icono de expandir todo suele ser "sap-icon://expand-all"
                        if (sIcon.indexOf("expand-all") >= 0 || sIcon.indexOf("expand") >= 0) {
                            return true;
                        }
                    }
                    return false;
                });
                
                if (aButtons.length > 0) {
                    oExpandButton = aButtons[0];
                    console.log("Botón ExpandAll encontrado por icono:", oExpandButton.getId());
                }
            }
            
            // Método 3: Buscar en la toolbar del TreeTable
            if (!oExpandButton) {
                var aToolbarButtons = sap.ui.core.Element.registry.filter(function(oElement) {
                    if (oElement.isA && oElement.isA("sap.m.OverflowToolbarButton")) {
                        var sId = oElement.getId() || "";
                        if (sId.indexOf("Expand") >= 0) {
                            return true;
                        }
                    }
                    return false;
                });
                
                if (aToolbarButtons.length > 0) {
                    oExpandButton = aToolbarButtons[0];
                    console.log("Botón ExpandAll encontrado en toolbar:", oExpandButton.getId());
                }
            }
            
            // Si encontramos el botón, hacer click
            if (oExpandButton) {
                console.log("Haciendo click en botón de expandir...");
                oExpandButton.firePress();
                
                // Esperar a que se carguen los datos
                var oBinding = oTable.getBinding("rows");
                var iPreviousLength = 0;
                var iStableCount = 0;
                
                // Verificar periódicamente hasta que la cantidad de registros se estabilice
                var iInterval = setInterval(function() {
                    var iCurrentLength = oBinding.getLength();
                    console.log("Registros actuales:", iCurrentLength);
                    
                    if (iCurrentLength === iPreviousLength && iCurrentLength > 0) {
                        iStableCount++;
                        // Si se mantiene estable por 3 verificaciones (1.5 segundos), continuar
                        if (iStableCount >= 3) {
                            clearInterval(iInterval);
                            console.log("Expansión completada. Total registros:", iCurrentLength);
                            resolve();
                        }
                    } else {
                        iStableCount = 0;
                        iPreviousLength = iCurrentLength;
                    }
                }, 500);
                
                // Timeout máximo de 15 segundos
                setTimeout(function() {
                    clearInterval(iInterval);
                    console.log("Timeout de expansión alcanzado");
                    resolve();
                }, 15000);
                
            } else {
                console.log("No se encontró el botón de expandir. Intentando método alternativo...");
                
                // Fallback: usar expandToLevel
                if (oTable.expandToLevel) {
                    oTable.expandToLevel(99);
                }
                
                setTimeout(function() {
                    resolve();
                }, 2000);
            }
        });
    }

    /**
     * Genera el PDF con los tipos de cuenta seleccionados para despliegue
     */
    function generatePdf(oContext, aExpandTypes) {
        BusyIndicator.show(0);
        
        // Buscar TreeTable
        var oTable = findTreeTable();
        
        if (!oTable) {
            BusyIndicator.hide();
            MessageBox.error("No se encontró la tabla de datos.");
            return;
        }

        // Primero expandir todos los nodos
        MessageToast.show("Expandiendo jerarquía...");
        
        expandAllNodes(oTable).then(function() {
            MessageToast.show("Obteniendo datos...");
            
            fetchHierarchyData(oTable, function(aData, oParams) {
                if (aData.length === 0) {
                    BusyIndicator.hide();
                    MessageBox.warning("No se obtuvieron datos. Intente expandir manualmente algunos nodos y vuelva a intentar.");
                    return;
                }
                
                if (typeof pdfMake === "undefined") {
                    loadPdfMake(function() {
                        buildPdfDocument(aData, aExpandTypes, oParams);
                    });
                } else {
                    buildPdfDocument(aData, aExpandTypes, oParams);
                }
            });
        });
    }

    /**
     * Busca el TreeTable en la aplicación
     */
    function findTreeTable() {
        var aAllElements = sap.ui.core.Element.registry.filter(function(oElement) {
            return oElement.isA && oElement.isA("sap.ui.table.TreeTable");
        });
        
        if (aAllElements.length > 0) {
            return aAllElements[0];
        }
        return null;
    }

    /**
     * Busca el FilterBar en la aplicación
     */
    function findFilterBar() {
        var aAllElements = sap.ui.core.Element.registry.filter(function(oElement) {
            return oElement.isA && (
                oElement.isA("sap.ui.mdc.FilterBar") || 
                oElement.isA("sap.ui.comp.filterbar.FilterBar") ||
                oElement.isA("sap.fe.macros.FilterBar")
            );
        });
        
        if (aAllElements.length > 0) {
            return aAllElements[0];
        }
        return null;
    }

    /**
     * Obtiene el valor de un filtro del FilterBar
     */
    function getFilterValue(oFilterBar, sFilterName) {
        if (!oFilterBar) return null;
        
        try {
            // Método 1: MDC FilterBar - getConditions
            if (oFilterBar.getConditions) {
                var oConditions = oFilterBar.getConditions();
                if (oConditions && oConditions[sFilterName] && oConditions[sFilterName].length > 0) {
                    var oCondition = oConditions[sFilterName][0];
                    if (oCondition.values && oCondition.values.length > 0) {
                        return oCondition.values[0];
                    }
                }
            }
            
            // Método 2: Smart FilterBar - getFilterData
            if (oFilterBar.getFilterData) {
                var oFilterData = oFilterBar.getFilterData();
                if (oFilterData && oFilterData[sFilterName]) {
                    return oFilterData[sFilterName];
                }
            }
            
            // Método 3: Buscar controles de filtro directamente
            var aFilterItems = [];
            if (oFilterBar.getFilterItems) {
                aFilterItems = oFilterBar.getFilterItems();
            } else if (oFilterBar.getFilterGroupItems) {
                aFilterItems = oFilterBar.getFilterGroupItems();
            }
            
            for (var i = 0; i < aFilterItems.length; i++) {
                var oItem = aFilterItems[i];
                var sName = oItem.getName ? oItem.getName() : "";
                
                if (sName === sFilterName || sName.indexOf(sFilterName) >= 0) {
                    var oControl = oItem.getControl ? oItem.getControl() : null;
                    if (oControl) {
                        if (oControl.getValue) {
                            return oControl.getValue();
                        }
                        if (oControl.getSelectedKey) {
                            return oControl.getSelectedKey();
                        }
                        if (oControl.getSelectedKeys) {
                            var aKeys = oControl.getSelectedKeys();
                            return aKeys.length > 0 ? aKeys[0] : null;
                        }
                    }
                }
            }
            
            // Método 4: Buscar en el modelo interno del FilterBar
            var oInternalModel = oFilterBar.getModel("$filterBar");
            if (oInternalModel) {
                var oData = oInternalModel.getData();
                if (oData && oData[sFilterName]) {
                    return oData[sFilterName];
                }
            }
            
        } catch (e) {
            console.log("Error obteniendo filtro " + sFilterName + ":", e);
        }
        
        return null;
    }

    /**
     * Obtiene los parámetros de filtro desde múltiples fuentes
     */
    function getFilterParameters() {
        var oParams = {
            CompanyCode: "1001",
            FiscalYear: new Date().getFullYear().toString()
        };
        
        // Fuente 1: FilterBar de Fiori Elements
        var oFilterBar = findFilterBar();
        if (oFilterBar) {
            console.log("FilterBar encontrado:", oFilterBar.getId());
            
            // Intentar obtener CompanyCode
            var sCompanyCode = getFilterValue(oFilterBar, "CompanyCode") ||
                               getFilterValue(oFilterBar, "P_CompanyCode") ||
                               getFilterValue(oFilterBar, "companyCode");
            if (sCompanyCode) {
                oParams.CompanyCode = sCompanyCode;
                console.log("CompanyCode desde FilterBar:", sCompanyCode);
            }
            
            // Intentar obtener FiscalYear
            var sFiscalYear = getFilterValue(oFilterBar, "FiscalYear") ||
                              getFilterValue(oFilterBar, "P_FiscalYear") ||
                              getFilterValue(oFilterBar, "fiscalYear");
            if (sFiscalYear) {
                oParams.FiscalYear = sFiscalYear;
                console.log("FiscalYear desde FilterBar:", sFiscalYear);
            }
        }
        
        // Fuente 2: URL/Hash (fallback)
        try {
            var sHash = window.location.hash;
            var sUrl = window.location.href;
            var sSearchString = sHash + sUrl;
            
            // Buscar CompanyCode si no se encontró en FilterBar
            if (oParams.CompanyCode === "1001") {
                var aCompanyMatch = sSearchString.match(/CompanyCode[=']+'?([^&',)]+)/i);
                if (aCompanyMatch) {
                    oParams.CompanyCode = aCompanyMatch[1].replace(/[')]/g, "");
                    console.log("CompanyCode desde URL:", oParams.CompanyCode);
                }
            }
            
            // Buscar FiscalYear si no se encontró en FilterBar
            var aYearMatch = sSearchString.match(/FiscalYear[=']+'?([^&',)]+)/i);
            if (aYearMatch) {
                var sYear = aYearMatch[1].replace(/[')]/g, "");
                if (sYear && sYear !== oParams.FiscalYear) {
                    oParams.FiscalYear = sYear;
                    console.log("FiscalYear desde URL:", oParams.FiscalYear);
                }
            }
        } catch (e) {
            console.log("Error obteniendo parámetros de URL:", e);
        }
        
        // Fuente 3: Buscar en inputs/controles visibles con ciertos nombres
        try {
            var aInputs = sap.ui.core.Element.registry.filter(function(oElement) {
                if (oElement.isA && (oElement.isA("sap.m.Input") || oElement.isA("sap.m.ComboBox") || oElement.isA("sap.m.Select"))) {
                    var sId = oElement.getId() || "";
                    return sId.indexOf("CompanyCode") >= 0 || sId.indexOf("companyCode") >= 0;
                }
                return false;
            });
            
            if (aInputs.length > 0 && oParams.CompanyCode === "1001") {
                var oInput = aInputs[0];
                var sValue = "";
                if (oInput.getValue) sValue = oInput.getValue();
                else if (oInput.getSelectedKey) sValue = oInput.getSelectedKey();
                
                if (sValue && sValue.trim() !== "") {
                    oParams.CompanyCode = sValue.trim();
                    console.log("CompanyCode desde Input:", oParams.CompanyCode);
                }
            }
        } catch (e) {
            console.log("Error buscando inputs:", e);
        }
        
        // Fuente 4: Datos del binding de la tabla
        try {
            var oTable = findTreeTable();
            if (oTable) {
                var oBinding = oTable.getBinding("rows");
                if (oBinding) {
                    // Intentar obtener del path del binding
                    var sPath = oBinding.getPath() || "";
                    var aPathMatch = sPath.match(/CompanyCode='([^']+)'/i);
                    if (aPathMatch && oParams.CompanyCode === "1001") {
                        oParams.CompanyCode = aPathMatch[1];
                        console.log("CompanyCode desde binding path:", oParams.CompanyCode);
                    }
                    
                    // Intentar obtener de los contextos
                    var aContexts = oBinding.getAllCurrentContexts ? oBinding.getAllCurrentContexts() : [];
                    if (aContexts.length > 0) {
                        var oFirstData = aContexts[0].getObject();
                        if (oFirstData) {
                            if (oFirstData.CompanyCode && oParams.CompanyCode === "1001") {
                                oParams.CompanyCode = oFirstData.CompanyCode;
                                console.log("CompanyCode desde datos:", oParams.CompanyCode);
                            }
                            if (oFirstData.FiscalYear) {
                                oParams.FiscalYear = oFirstData.FiscalYear;
                                console.log("FiscalYear desde datos:", oParams.FiscalYear);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log("Error obteniendo datos del binding:", e);
        }
        
        console.log("Parámetros finales:", oParams);
        return oParams;
    }

    /**
     * Obtiene los datos jerárquicos usando requestContexts
     */
    function fetchHierarchyData(oTable, fnCallback) {
        var aData = [];
        
        // Obtener parámetros de filtro
        var oParams = getFilterParameters();
        
        if (oTable) {
            var oBinding = oTable.getBinding("rows");
            
            if (oBinding) {
                var iLength = oBinding.getLength();
                console.log("Total registros en binding:", iLength);
                
                // Usar requestContexts para obtener TODOS los datos
                if (oBinding.requestContexts) {
                    oBinding.requestContexts(0, iLength).then(function(aContexts) {
                        console.log("Contextos obtenidos:", aContexts.length);
                        
                        aContexts.forEach(function(oCtx) {
                            if (oCtx) {
                                var oRowData = oCtx.getObject();
                                if (oRowData) {
                                    // Log para debug de primeros registros
                                    if (aData.length < 3) {
                                        console.log("Registro " + aData.length + ":", oRowData);
                                    }
                                    
                                    // Actualizar CompanyCode desde los datos si está disponible
                                    if (aData.length === 0 && oRowData.CompanyCode) {
                                        oParams.CompanyCode = oRowData.CompanyCode;
                                    }
                                    
                                    aData.push(oRowData);
                                }
                            }
                        });
                        
                        console.log("Total datos procesados:", aData.length);
                        fnCallback(aData, oParams);
                    }).catch(function(oError) {
                        console.error("Error en requestContexts:", oError);
                        // Fallback
                        var aFallbackContexts = oBinding.getAllCurrentContexts();
                        aFallbackContexts.forEach(function(oCtx) {
                            if (oCtx) {
                                var oRowData = oCtx.getObject();
                                if (oRowData) {
                                    aData.push(oRowData);
                                }
                            }
                        });
                        fnCallback(aData, oParams);
                    });
                    return;
                }
            }
        }
        
        fnCallback(aData, oParams);
    }

    /**
     * Cargar pdfMake dinámicamente
     */
    function loadPdfMake(fnCallback) {
        var script1 = document.createElement("script");
        script1.src = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js";
        script1.onload = function() {
            var script2 = document.createElement("script");
            script2.src = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js";
            script2.onload = fnCallback;
            document.head.appendChild(script2);
        };
        document.head.appendChild(script1);
    }

    // ============================
    // DISEÑO DE TABLA (MODIFICADO)
    // ============================
    function buildPdfDocument(aData, aExpandTypes, oParams) {
        var sCompanyCode = oParams.CompanyCode || "1001";
        var sFiscalYear = oParams.FiscalYear || new Date().getFullYear().toString();
        var oCompanyInfo = mCompanyConfig[sCompanyCode] || { nombre: "EMPRESA", ruc: "00000000-0" };
        
        // Fecha actual para el pie de página o subtítulo
        var oNow = new Date();
        var sDateTime = formatDateTime(oNow);

        // 1. Procesar datos
        var aTableBody = processHierarchyForTable(aData, aExpandTypes,oParams.CompanyCode);

        // 2. Encabezado de la tabla
        var aHeaderRow = [
            { text: "Cuenta / Código", style: 'tableHeader', alignment: 'left' },
            { text: "Descripción Cuenta / Detalle", style: 'tableHeader', alignment: 'left' },
            { text: "Importe", style: 'tableHeader', alignment: 'right' }
        ];
        aTableBody.unshift(aHeaderRow);

        // Document Definition
        var docDefinition = {
            pageSize: "A4",
            pageMargins: [30, 30, 30, 30],
            
            content: [
                // --- ENCABEZADO ---
                {
                    stack: [
                        { text: oCompanyInfo.nombre, style: 'headerCompany' },
                        { text: oCompanyInfo.ruc, style: 'headerRuc', margin: [0, 2, 0, 10] },
                        
                        { text: "LIBRO DE INVENTARIO", style: 'reportTitle', margin: [0, 5, 0, 2] },
                        { 
                            text: "Inventario General de la firma practicado al 31 de Diciembre del año: " + sFiscalYear, 
                            style: 'reportSubtitle', 
                            margin: [0, 0, 0, 15] 
                        }
                    ]
                },

                // --- TABLA DE DATOS (SOLO DISEÑO CAMBIADO) ---
                {
                    table: {
                        headerRows: 1,
                        dontBreakRows: true,
                        // Anchos más parecidos al informe original: código angosto, descripción muy amplia, importe medio
                        widths: [75, '*', 90],
                        body: aTableBody
                    },
                    layout: {
                        // 1. Sin líneas verticales
                        vLineWidth: function() { return 0; },
                        
                        // 2. Control inteligente de líneas horizontales
                        hLineWidth: function(i, node) {
                            // A. Línea superior de la tabla: Invisible
                            if (i === 0) { return 0; }
                            
                            // B. Línea debajo de los encabezados de columna: Visible y gruesa
                            if (i === 1) { return 1; }

                            // C. Línea FINAL de la tabla: Invisible (para evitar doble línea al final de hoja)
                            if (i === node.table.body.length) { return 0; }

                            // --- D. TRUCO PARA EL ESPACIADO DEL PARENT NODE ---
                            // Verificamos si la fila ACTUAL (index i) es un título principal (Parent Node).
                            // Si lo es, quitamos la línea SUPERIOR (return 0) para que el margen se vea limpio.
                            if (i < node.table.body.length) {
                                var currentRow = node.table.body[i];
                                // Verificamos si la primera celda tiene el estilo 'rowGroupRoot'
                                if (currentRow && currentRow[0] && currentRow[0].style === 'rowGroupRoot') {
                                    return 0; 
                                }
                            }

                            // E. Resto de líneas (separadores internos): Finas
                            return 0.5; 
                        },

                        // 3. Color de líneas
                        hLineColor: function() {
                            return '#aaaaaa'; // Gris suave
                        },

                        // 4. Espaciados
                        paddingLeft: function(i) { return i === 0 ? 0 : 4; },
                        paddingRight: function(i) { return i === 2 ? 0 : 2; },
                        paddingTop: function() { return 3; },
                        paddingBottom: function() { return 3; }
                    }
                }
            ],

            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        { text: sDateTime, fontSize: 7, color: '#666666', margin: [30, 0, 0, 0] },
                        { text: "Pág: " + currentPage, fontSize: 7, alignment: "right", margin: [0, 0, 30, 0], color: '#666666' }
                    ],
                    margin: [0, 10, 0, 0]
                };
            },

            styles: {
                // Encabezado
                headerCompany: { fontSize: 10, bold: true, color: '#000000' },
                headerRuc: { fontSize: 9, color: '#000000' },
                reportTitle: { fontSize: 11, bold: true, alignment: 'left', decoration: 'underline' },
                reportSubtitle: { fontSize: 10, alignment: 'left', color: '#000000' },
                
                // --- Estilos tabla (SOLO DISEÑO) ---
                tableHeader: { 
                    fontSize: 8.5, 
                    bold: true, 
                    margin: [2, 3, 2, 3],
                    fillColor: '#f2f2f2',
                    color: '#000000'
                },
                subtotalLabel: {
                    fontSize: 9,
                    bold: true,
                    margin: [0, 2, 0, 0]
                },
                subtotalAmountBold: {
                    fontSize: 9,
                    bold: true,
                    alignment: "right",
                    margin: [0, 2, 0, 0]
                },
                // Nivel raíz (ACTIVO, PASIVO, etc.)
                rowGroupRoot: { 
                    fontSize: 9.5, 
                    bold: true, 
                    margin: [0, 8, 0, 2]
                },
                // Subgrupos (ACTIVO CORRIENTE, Disponibilidades, etc.)
                rowGroup: { 
                    fontSize: 9, 
                    bold: true, 
                    margin: [0, 4, 0, 1]
                },
                // Cuentas hoja
                rowItem: { 
                    fontSize: 8.5, 
                    margin: [0, 1, 0, 1]
                },
                // Nodos padre sin importe (para diferenciar de hojas)
                rowParent: { 
                    fontSize: 8.5, 
                    bold: true,
                    margin: [0, 1, 0, 1]
                },
                // Detalles (Código de BP / Material)
                rowDetail: { 
                    fontSize: 8, 
                    color: '#333333', 
                    margin: [0, 0.5, 0, 0.5]
                },
                
                // Importe
                colAmount: { 
                    fontSize: 8.5, 
                    alignment: 'right'
                },
                colAmountBold: { 
                    fontSize: 9, 
                    bold: true, 
                    alignment: 'right'
                }
            }
        };

        // Generar y descargar
        var sFileName = "Libro_Inventario_" + sCompanyCode + "_" + sFiscalYear + ".pdf";
        
        if (typeof pdfMake !== 'undefined') {
            pdfMake.createPdf(docDefinition).download(sFileName);
            BusyIndicator.hide();
            MessageToast.show("PDF generado correctamente.");
        } else {
            BusyIndicator.hide();
            MessageBox.error("La librería PDFMake no se ha cargado.");
        }
    }

    /**
     * Procesa la jerarquía. Usa directamente SaldoDisplay eliminando "PYG".
     */
    function formatAmountNumber(nAmount) {
        if (nAmount === null || nAmount === undefined || isNaN(nAmount)) {
            return "";
        }

        var bIsNegative = nAmount < 0;
        var nAbs = Math.abs(nAmount);

        var sFormatted = nAbs.toLocaleString("es-ES", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });

        return (bIsNegative ? "-" : "") + sFormatted;
    }

    /**
     * Procesa la jerarquía. 
     * CORRECCIÓN: Se renombra visualmente "PASIVO Y PATRIMONIO" a "PASIVO" para la sociedad 1004.
     */
    function processHierarchyForTable(aData, aExpandTypes, sCompanyCode) {
        var aBody = [];
        
        // =============================================
        // 1. CONFIGURACIÓN Y CONSTANTES
        // =============================================
        
        var ROOT_MAP = {
            "ACTIVO": "ACTIVO",
            "ACTIVOS": "ACTIVO",
            "PASIVO": "PASIVO",
            "PASIVOS": "PASIVO",
            
            // Variaciones para 1004 y estándar
            "PASIVO CORRIENTE": "PASIVO",
            "PASIVO NO CORRIENTE": "PASIVO",
            "PASIVO  NO CORRIENTE": "PASIVO", 
            
            "PATRIMONIO": "PATRIMONIO",
            "PASIVO Y PATRIMONIO": "PASIVO_PATRIMONIO", 
            "PATRIMONIO NETO": "PATRIMONIO",
            
            "INGRESOS": "INGRESOS",
            "COSTO OPERATIVO": "COSTO OPERATIVO",
            "COSTOS OPERATIVOS": "COSTO OPERATIVO",
            "GASTOS OPERATIVOS": "GASTOS OPERATIVOS",
            "CUENTAS SECUNDARIAS": "CUENTAS SECUNDARIAS",
            "MIGRACION": "MIGRACION",
            "MIGRACIÓN": "MIGRACION"
        };

        var EXCLUDED_NODES = [
            "1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008", "1009", "1010",
            "Centas sin Asignar -1004",
            "1005.",
            "RESULTADO PYG", 
            "BENEFICIO CALCULADO", 
            "PERDIDA CALCULADA", 
            "PÉRDIDA CALCULADA",
            "CUENTAS SECUNDARIAS"
        ];

        var mCalculatedTotals = {};
        var sCurrentRoot = null;
        var nSkippingBelowLevel = -1;
        var aDetailBuffer = []; 

        // =============================================
        // 2. HELPERS
        // =============================================

        function parseSaldoToNumber(sSaldo) {
            if (!sSaldo) return 0;
            var cleaned = sSaldo.toString().replace(/PYG/gi, "").trim();
            var bNeg = false;
            if (cleaned.endsWith("-")) { bNeg = true; cleaned = cleaned.slice(0, -1).trim(); }
            else if (cleaned.startsWith("-")) { bNeg = true; cleaned = cleaned.slice(1).trim(); }
            
            var iCommaCount = (cleaned.match(/,/g) || []).length;
            var iDotCount = (cleaned.match(/\./g) || []).length;
            
            if (iCommaCount > iDotCount) { cleaned = cleaned.replace(/,/g, ""); }
            else if (iDotCount > iCommaCount) { cleaned = cleaned.replace(/\./g, "").replace(/,/g, "."); }
            else if (iCommaCount === 1 && iDotCount === 0) {
                var iCommaPos = cleaned.indexOf(",");
                if (cleaned.length - iCommaPos <= 3) { cleaned = cleaned.replace(/,/g, "."); }
                else { cleaned = cleaned.replace(/,/g, ""); }
            } else if (iDotCount === 1 && iCommaCount === 0) {
                var iDotPos = cleaned.indexOf(".");
                if (cleaned.length - iDotPos > 3) { cleaned = cleaned.replace(/\./g, ""); }
            } else { cleaned = cleaned.replace(/\./g, "").replace(/,/g, ""); }
            
            var f = parseFloat(cleaned);
            return isNaN(f) ? 0 : (bNeg ? -f : f);
        }

        function formatAmountNumber(nAmount) {
            if (nAmount === null || nAmount === undefined || isNaN(nAmount)) { return ""; }
            var bIsNegative = nAmount < 0;
            var nAbs = Math.abs(nAmount);
            var sFormatted = nAbs.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            return (bIsNegative ? "-" : "") + sFormatted;
        }

        // =============================================
        // 3. FUNCIONES DE LÓGICA DE TABLA
        // =============================================

        function flushDetails() {
            if (aDetailBuffer.length === 0) return;
            var nLevel = aDetailBuffer[0].level; 
            var nIndent = Math.max(0, (nLevel - 2) * 10) + 10;
            var mGroups = {};

            aDetailBuffer.forEach(function(oItem) {
                var oDet = oItem.data; 
                var sType = oDet.FinancialAccountType || "";
                var nAmount = parseSaldoToNumber(oDet.SaldoDisplay);
                var sKey = "", sName = "", sCode = "";

                if (["D", "K"].includes(sType)) {
                    sCode = oDet.BusinessPartner || "SIN_CODIGO";
                    sName = oDet.BusinessPartnerName || "Socio sin nombre";
                    sKey = sCode; 
                } else if (sType === "M") {
                    sCode = oDet.Product || "SIN_PROD";
                    sName = oDet.ProductName || "Producto sin nombre";
                    sKey = sCode;
                } else {
                    sCode = oDet.AccountingDocument || "";
                    sName = oDet.AccountingDocument || ""; 
                    sKey = sCode + "_" + (Math.random()); 
                }

                if (!mGroups[sKey]) { mGroups[sKey] = { code: sCode, name: sName, amount: 0 }; }
                mGroups[sKey].amount += nAmount;
            });

            Object.keys(mGroups).forEach(function(k) {
                var oGroup = mGroups[k];
                aBody.push([
                    { text: oGroup.code, style: "rowDetail", alignment: "left" },
                    { text: oGroup.name, style: "rowDetail", margin: [nIndent, 0, 0, 0] }, 
                    { text: formatAmountNumber(oGroup.amount), style: "colAmount" } 
                ]);
            });
            aDetailBuffer = [];
        }

        function closeCurrentRoot() {
            if (!sCurrentRoot) return;
            var nTotal = mCalculatedTotals[sCurrentRoot] || 0;
            var sLabel = "Total " + sCurrentRoot; 
            var bIsPatrimonio = (sCurrentRoot === "PATRIMONIO" || sCurrentRoot === "PATRIMONIO NETO");

            if (bIsPatrimonio) {
                aBody.push([
                    { text: "", style: "subtotalLabel", alignment: "left" },
                    { text: sLabel, style: "subtotalLabel", margin: [0, 5, 0, 0] }, 
                    { text: formatAmountNumber(nTotal), style: "subtotalAmountBold", margin: [0, 5, 0, 0] }
                ]);
                var nTotalPN = mCalculatedTotals["PATRIMONIO"] || mCalculatedTotals["PATRIMONIO NETO"] || 0;
                var nTotalPasivo = mCalculatedTotals["PASIVO"] || 0; 
                aBody.push([
                    { text: "", style: "subtotalLabel", alignment: "left" },
                    { text: "Total Pasivo + Patrimonio Neto", style: "subtotalLabel", margin: [0, 5, 0, 30] }, 
                    { text: formatAmountNumber(nTotalPN + nTotalPasivo), style: "subtotalAmountBold", margin: [0, 5, 0, 30] }
                ]);
            } else {
                aBody.push([
                    { text: "", style: "subtotalLabel", alignment: "left" },
                    { text: sLabel, style: "subtotalLabel", margin: [0, 5, 0, 25] }, 
                    { text: formatAmountNumber(nTotal), style: "subtotalAmountBold", margin: [0, 5, 0, 25] }
                ]);
            }
            sCurrentRoot = null;
        }

        // =============================================
        // 4. ITERACIÓN PRINCIPAL
        // =============================================
        
        aData.forEach(function(oRow) {
            var nLevel = parseInt(oRow["@$ui5.node.level"]) || 0;
            if (nLevel === 1) { return; }

            var sNodeText = (oRow.NodeText || "").toString().trim();
            var sNodeTextUpper = sNodeText.toUpperCase();

            // Lógica de saltos
            if (nSkippingBelowLevel !== -1 && nLevel <= nSkippingBelowLevel) { nSkippingBelowLevel = -1; }
            if (nSkippingBelowLevel !== -1) { return; }
            if (EXCLUDED_NODES.includes(sNodeTextUpper)) { nSkippingBelowLevel = nLevel; return; }
            
            var sGLAccount = (oRow.GLAccount || "").toString().trim();
            var bIsDetailNode = !!oRow.AccountingDocument; 

            // Buffer de Detalles
            if (bIsDetailNode) {
                var sAccountType = oRow.FinancialAccountType || "";
                if (aExpandTypes.includes(sAccountType)) {
                    aDetailBuffer.push({ data: oRow, level: nLevel });
                }
                return;
            } else {
                flushDetails();
            }
            
            // --- DETECCIÓN DE BLOQUE PRINCIPAL (ADAPTADO) ---
            var sPotentialRoot = ROOT_MAP[sNodeTextUpper];
            var bShouldSwitchRoot = false;
            var bIgnoreRootSet = false; 

            if (sCompanyCode === "1004") {
                // CASO ESPECIAL 1004:
                // Si es "PASIVO Y PATRIMONIO" (Nivel 2), no lo tratamos como root de acumulación,
                // pero sí lo mostramos como título.
                if (nLevel === 2 && sNodeTextUpper.indexOf("PASIVO") >= 0 && sNodeTextUpper.indexOf("PATRIMONIO") >= 0) {
                    if (sCurrentRoot) closeCurrentRoot();
                    bIgnoreRootSet = true;
                }
                // Si estamos en Nivel 3 y es un hijo directo (Pasivo C., Patrimonio, etc)
                else if (nLevel === 3 && sPotentialRoot) {
                    bShouldSwitchRoot = true;
                }
                // Nivel 2 normal (Activo, Ingresos) para 1004
                else if (nLevel === 2 && sPotentialRoot && !(sNodeTextUpper.indexOf("PASIVO") >= 0 && sNodeTextUpper.indexOf("PATRIMONIO") >= 0)) {
                    bShouldSwitchRoot = true;
                }
            } else {
                // CASO ESTÁNDAR
                if (nLevel === 2 && sPotentialRoot) {
                    bShouldSwitchRoot = true;
                }
            }

            // Aplicar cambio de Root
            if (bShouldSwitchRoot) {
                if (sCurrentRoot !== sPotentialRoot) {
                    if (sCurrentRoot) closeCurrentRoot();
                    sCurrentRoot = sPotentialRoot;
                    if (typeof mCalculatedTotals[sCurrentRoot] === "undefined") { mCalculatedTotals[sCurrentRoot] = 0; }
                }
            } else if (bIgnoreRootSet) {
                sCurrentRoot = null;
            }

            // --- Filtros de Visualización ---
            var bExpanded = oRow["@$ui5.node.isExpanded"];
            var sSaldoDisplayRaw = (oRow.SaldoDisplay || "").toString();
            var bHasSaldo = sSaldoDisplayRaw.trim() !== "";
            var bIsStructuralNode = (bShouldSwitchRoot || bIgnoreRootSet);

            if (!bExpanded && !bHasSaldo && !bIsStructuralNode) { return; }

            // --- Acumulación de Totals ---
            if (sCurrentRoot && sGLAccount && !bIsDetailNode && bHasSaldo) {
                var nVal = parseSaldoToNumber(sSaldoDisplayRaw);
                if (!oRow._totalsCalculated) { 
                    mCalculatedTotals[sCurrentRoot] += nVal;
                    oRow._totalsCalculated = true;
                }
            }

            // --- Estilos y Texto ---
            var sAccountDesc = (oRow.NodeText || oRow.GLAccountLongName || oRow.GLAccountText || "").toString().trim();
            
            // >>>>>>>>>>> CORRECCIÓN AQUÍ <<<<<<<<<<<
            // Si es sociedad 1004 y el texto es "PASIVO Y PATRIMONIO", lo forzamos a "PASIVO" en el PDF
            if (sCompanyCode === "1004" && sAccountDesc.toUpperCase() === "PASIVO Y PATRIMONIO") {
                sAccountDesc = "PASIVO";
            }

            var sAmountFormatted = bHasSaldo ? sSaldoDisplayRaw.replace(/PYG/gi, "").trim() : "";
            if (sAmountFormatted.endsWith("-")) { sAmountFormatted = "-" + sAmountFormatted.slice(0, -1); }

            var sCodeColumn = sGLAccount || "";
            var sDescColumn = sAccountDesc || sGLAccount;
            var sRowStyle = "rowItem"; 
            var sAmountStyle = "colAmount";

            // Estilos dinámicos
            if (bIsStructuralNode) {
                sRowStyle = "rowGroupRoot"; 
                sAmountStyle = "colAmountBold";
            } else if (nLevel === 3 && sCompanyCode !== "1004") {
                sRowStyle = "rowGroup"; 
                sAmountStyle = "colAmountBold";
            } else if (!bHasSaldo) {
                sRowStyle = "rowParent";
                sAmountStyle = "colAmount";
            }

            var nIndent = Math.max(0, (nLevel - 2) * 10);

            aBody.push([
                { text: sCodeColumn, style: sRowStyle, alignment: "left" },
                { text: sDescColumn, style: sRowStyle, margin: [nIndent, 0, 0, 0] },
                { text: sAmountFormatted, style: sAmountStyle }
            ]);
        });

        flushDetails();
        closeCurrentRoot();

        if (aBody.length === 0) {
            aBody.push([{ text: "No hay datos disponibles.", colSpan: 3, alignment: "center", italics: true }, {}, {}]);
        }

        return aBody;
    }

    function formatAmount(nAmount) {
        if (nAmount === null || nAmount === undefined) return "";
        
        var nRounded = Math.round(nAmount);
        var bIsNegative = nRounded < 0;
        var nAbsValue = Math.abs(nRounded);
        var sFormatted = nAbsValue.toLocaleString('es-ES'); 
        
        if (bIsNegative) {
            return sFormatted + "-";
        }
        return sFormatted;
    }

    function formatDateTime(oDate) {
        var sDate = oDate.toLocaleDateString('es-PY');
        var sTime = oDate.toLocaleTimeString('es-PY', {hour: '2-digit', minute:'2-digit'});
        return sDate + " " + sTime;
    }

    // =============================================
    // HANDLER PÚBLICO
    // =============================================
    return {
        exportPdf: function(oContext, aSelectedContexts) {
            // Buscar TreeTable
            var oTable = findTreeTable();
            
            // Validar que se haya aplicado filtros (botón Go)
            if (!isDataLoaded(oTable)) {
                MessageBox.warning(
                    "Debe aplicar los filtros primero.\n\nPor favor, complete los filtros obligatorios (Sociedad y Ejercicio Fiscal) y presione el botón 'Ir' antes de exportar.",
                    {
                        title: "Filtros requeridos"
                    }
                );
                return;
            }
            
            // Crear checkboxes
            var oCheckBoxD = new CheckBox({
                text: "D - Deudores (Clientes)",
                selected: false
            });
            
            var oCheckBoxK = new CheckBox({
                text: "K - Acreedores (Proveedores)", 
                selected: false
            });
            
            var oCheckBoxM = new CheckBox({
                text: "M - Material (Productos)",
                selected: false
            });

            var oDialog = new Dialog({
                title: "Exportar Libro Inventario",
                type: "Message",
                content: new VBox({
                    items: [
                        new Label({ 
                            text: "Seleccione los tipos de cuenta a DESPLEGAR:",
                            design: "Bold"
                        }).addStyleClass("sapUiSmallMarginBottom"),
                        new Text({
                            text: "Los tipos seleccionados mostrarán el detalle por documento/interlocutor."
                        }).addStyleClass("sapUiTinyMarginBottom"),
                        new Text({
                            text: "Los tipos NO seleccionados mostrarán solo el total agregado de la cuenta."
                        }).addStyleClass("sapUiTinyMarginBottom sapUiSmallMarginBottom"),
                        oCheckBoxD,
                        oCheckBoxK,
                        oCheckBoxM
                    ]
                }).addStyleClass("sapUiSmallMargin"),
                beginButton: new Button({
                    text: "Exportar PDF",
                    type: "Emphasized",
                    press: function() {
                        var aExpandTypes = [];
                        if (oCheckBoxD.getSelected()) aExpandTypes.push("D");
                        if (oCheckBoxK.getSelected()) aExpandTypes.push("K");
                        if (oCheckBoxM.getSelected()) aExpandTypes.push("M");
                        
                        oDialog.close();
                        generatePdf(oContext, aExpandTypes);
                    }
                }),
                endButton: new Button({
                    text: "Cancelar",
                    press: function() {
                        oDialog.close();
                    }
                }),
                afterClose: function() {
                    oDialog.destroy();
                }
            });

            oDialog.open();
        }
    };
});