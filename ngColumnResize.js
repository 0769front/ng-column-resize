(function(ng) {

	var module = ng.module('columnResize', []);

	module.factory('Table', function() {
		var service = {build:{}};

		// Indicates whether a resizing process is active
		service.resizing = {process:false};

		// Builds default state of table to have equally spaced columns
		service.build.buildDefaultState = function() {
			service.state = {};
			var numCols = service.layout.numCols;
			var columnWidthPercentage = 100 / numCols;
			for(var i = 0; i < numCols; i++) {
				service.state[i] = columnWidthPercentage;
			};
		};

		// Builds the domTargets mapping object
		service.build.buildDomTargets = function() {
			service.domTargets = {};
			var tableLeft = service.layout.tableLeft;
			var numCols = service.layout.numCols;
			var tableWidth = service.layout.tableWidth;
			var coordinateCache = undefined;
			for(var i = 0; i < numCols; i++) {
				var borderCoordinate = Math.round(tableWidth * (0.01 * service.state[i]) + tableLeft);
				coordinateCache ? borderCoordinate += coordinateCache : null;
				service.domTargets[borderCoordinate] = i
				coordinateCache = borderCoordinate - tableLeft;
				for(var x = 1; x < 6; x++) {
					service.domTargets[borderCoordinate + x] = i;
					service.domTargets[borderCoordinate - x] = i;
				};
			};
		};

		// Apply inline %based width style properties to all table cells and write 
		service.setInlineWidths = function(resizeColumn) {
			var leftColumn = resizeColumn;
			var rightColumn = resizeColumn + 1;
			var numCols = service.layout.numCols;
			var thead = service.layout.theadElement[0];
			var tbody = service.layout.tbodyElement;

			angular.element(thead.cells[leftColumn]).attr('style', 'width:'+service.state[leftColumn]+'%;');
			angular.element(thead.cells[rightColumn]).attr('style', 'width:'+service.state[rightColumn]+'%;');

			[].forEach.call(tbody, function(row) {
				angular.element(row.cells[leftColumn]).attr('style', 'width:'+service.state[leftColumn]+'%;');
				angular.element(row.cells[rightColumn]).attr('style', 'width:'+service.state[rightColumn]+'%;');
			});
		};

		service.build.execute = function(element) {
			service.layout = {
				tbodyElement: angular.element(findBodyRows(element)),
				theadElement: angular.element(findHeaderRow(element)),
				tableLeft: element[0].offsetLeft,
				tableWidth: element[0].clientWidth,
				pixelPercentage: 100 / element[0].clientWidth
			};
			service.layout.numCols = service.layout.tbodyElement[0].cells.length;
			service.build.buildDefaultState();
			service.build.buildDomTargets();
		};

		var findBodyRows = function(element) {
			if(element[0].tagName !== 'TABLE') { return }
			return element[0].tBodies[0].rows
		};

		var findHeaderRow = function(element) {
			if(element[0].tagName !== 'TABLE') { return }
			var tHeadRows = element[0].tHead.rows;
			var bodyRow = findBodyRows(element)[0];
			if(tHeadRows.length > 0) {
				for(var i = 0; i < tHeadRows.length; i++) {
					if(tHeadRows[i].cells.length === bodyRow.cells.length) {
						return tHeadRows[i]
					}
				};
			}
		};

		console.log(service);
		return service
	});


	module.directive('columnResize', ['Table', '$window', '$document', '$timeout',
		function(Table, $window, $document, $timeout) {
			return {
				restrict: 'A',
				link: function(scope, element, attrs) {
					if(element[0].tagName !== "TABLE") { return }

						// console.log(element);

						scope.$watch('isLoading', function(val) {
							if(val === false) {
								$timeout(function() {
									Table.build.execute(element);
								}, 1);
							}
						});

					// Rewrite Service properties on window resize.
					angular.element($window).on('resize', function(e) {
						$timeout.cancel(scope.resizing);
						scope.resizing = $timeout(function() {
							Table.build.buildDomTargets(element);
						}, 300);
					});

					// Changes the cursor upon entering +/- 5px from a column border
					// or adjusts the size of columns bordering the targeted border 
					element.on('mousemove', function(evnt) {
						if(Table.resizing.process === true) {
							var percentChange = (evnt.clientX - Table.resizing.startPoint) * Table.layout.pixelPercentage;
							var originalState = Table.resizing.originalState;
							var resizeColumn = Table.resizing.column;
							if(Table.state[resizeColumn] > 0 && Table.state[resizeColumn +1] > 0) {
								Table.state[resizeColumn] = originalState[resizeColumn] + percentChange;
								Table.state[resizeColumn +1] = originalState[resizeColumn +1] - percentChange;
								Table.setInlineWidths(resizeColumn);
							} else {
									return
								}
						} else if(evnt.clientX in Table.domTargets) {
							$document[0].body.style.cursor = "col-resize";
						} else {
							$document[0].body.style.cursor = "";
						}
					});

					// Captures original coordinate of column border
					element.on('mousedown', function(evnt) {
						if($document[0].body.style.cursor === "col-resize") {
							Table.resizing.process = true;
							Table.resizing.column = Table.domTargets[evnt.clientX];
							Table.resizing.startPoint = evnt.clientX;
							Table.resizing.originalState = JSON.parse(JSON.stringify(Table.state));
						}
					});

					// Terminates the resizing process
					element.on('mouseup', function(evnt) {
						if(Table.resizing.process === true) {
							Table.build.buildDomTargets();
						}
						$document[0].body.style.cursor = "";
						Table.resizing = {process:false};
					});

				}

			}
		}
	]);

})(angular);