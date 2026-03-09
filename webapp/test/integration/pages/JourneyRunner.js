sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"libroinv/test/integration/pages/LibroInvJerarquiaList",
	"libroinv/test/integration/pages/LibroInvJerarquiaObjectPage"
], function (JourneyRunner, LibroInvJerarquiaList, LibroInvJerarquiaObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('libroinv') + '/test/flp.html#app-preview',
        pages: {
			onTheLibroInvJerarquiaList: LibroInvJerarquiaList,
			onTheLibroInvJerarquiaObjectPage: LibroInvJerarquiaObjectPage
        },
        async: true
    });

    return runner;
});

