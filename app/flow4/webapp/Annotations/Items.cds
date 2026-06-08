using Flow4Service as service from '../../../../srv/service';

annotate service.Items with @(UI: {
    SelectionFields: [
        'ItemCode',
        'ItemName'
    ],
    LineItem       : [
        'ItemCode',
        'ItemName'
    ]
});

annotate service.Items with {
    ItemCode @(
        Common.Text : ItemName,
        Common.Label: '{i18n>ITEM_CODE}'
    )
}
