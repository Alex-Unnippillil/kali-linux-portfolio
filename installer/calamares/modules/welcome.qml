import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.3

Page {
    id: root
    property string selectedPreset: "guided"

    signal presetSelected(string presetKey)
    signal requestNext()
    signal requestBack()

    title: qsTr("Welcome to the Kali Linux Installer")

    padding: 24

    function announceSelection(presetKey) {
        selectedPreset = presetKey
        presetSelected(presetKey)
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 24

        Label {
            Layout.fillWidth: true
            text: qsTr("Choose an installation preset to get started")
            font.pointSize: 18
            wrapMode: Text.WordWrap
        }

        Label {
            Layout.fillWidth: true
            text: qsTr("You can customise disk layouts later using the Advanced options below.")
            color: "#909090"
            wrapMode: Text.WordWrap
        }

        ButtonGroup { id: presetGroup }

        ColumnLayout {
            id: presetList
            Layout.fillWidth: true
            spacing: 12

            Repeater {
                model: [
                    {
                        key: "guided",
                        title: qsTr("Guided install"),
                        summary: qsTr("Use the entire disk"),
                        details: qsTr("Creates an ext4 root partition with an automatically sized swap file.")
                    },
                    {
                        key: "dualboot",
                        title: qsTr("Install alongside another OS"),
                        summary: qsTr("Shrink the largest partition"),
                        details: qsTr("Resizes the largest volume to free space, keeping existing operating systems intact.")
                    },
                    {
                        key: "custom",
                        title: qsTr("Manual partitioning"),
                        summary: qsTr("Control every partition"),
                        details: qsTr("Opens the manual partitioning tool for complete control of mounts and flags.")
                    }
                ]

                delegate: RadioDelegate {
                    id: presetDelegate
                    required property string key
                    required property string title
                    required property string summary
                    required property string details

                    text: title
                    checked: root.selectedPreset === key
                    ButtonGroup.group: presetGroup
                    width: presetList.width
                    implicitHeight: 96
                    padding: 16

                    contentItem: ColumnLayout {
                        anchors.fill: parent
                        spacing: 4

                        Label {
                            text: title
                            font.pointSize: 16
                            font.bold: true
                            wrapMode: Text.WordWrap
                        }

                        Label {
                            text: summary
                            font.pointSize: 13
                            wrapMode: Text.WordWrap
                        }

                        Label {
                            text: details
                            font.pointSize: 12
                            color: "#707070"
                            wrapMode: Text.WordWrap
                        }
                    }

                    background: Rectangle {
                        radius: 12
                        border.width: checked ? 2 : 1
                        border.color: checked ? "#3C9BE7" : "#C5C5C5"
                        color: checked ? "#E7F4FF" : "#ffffff"
                    }

                    onClicked: root.announceSelection(key)
                }
            }
        }

        Expander {
            id: advancedExpander
            Layout.fillWidth: true
            text: qsTr("Advanced disk options")

            contentItem: ColumnLayout {
                spacing: 16
                padding: 16

                Switch {
                    id: encryptionSwitch
                    text: qsTr("Enable full-disk encryption")
                    checked: false
                }

                Switch {
                    id: lvmSwitch
                    text: qsTr("Use LVM volume management")
                    checked: false
                }

                RowLayout {
                    spacing: 12
                    Label {
                        text: qsTr("File system")
                        Layout.alignment: Qt.AlignVCenter
                    }
                    ComboBox {
                        id: filesystemChooser
                        Layout.fillWidth: true
                        model: [ "ext4", "btrfs", "xfs" ]
                    }
                }
            }
        }

        Expander {
            id: bootloaderExpander
            Layout.fillWidth: true
            text: qsTr("Bootloader settings")

            contentItem: ColumnLayout {
                spacing: 16
                padding: 16

                RowLayout {
                    spacing: 12
                    Label {
                        text: qsTr("Install bootloader to")
                        Layout.alignment: Qt.AlignVCenter
                    }
                    ComboBox {
                        id: bootloaderTarget
                        Layout.fillWidth: true
                        model: [
                            qsTr("Default (first disk)"),
                            qsTr("Specific device /dev/sda"),
                            qsTr("Specific device /dev/nvme0n1"),
                            qsTr("Skip bootloader installation")
                        ]
                    }
                }

                CheckBox {
                    id: fallbackBootloader
                    text: qsTr("Create a legacy BIOS fallback entry")
                    checked: false
                }
            }
        }

        Item { Layout.fillHeight: true }

        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            Button {
                text: qsTr("Back")
                implicitWidth: Math.max(implicitWidth, 120)
                implicitHeight: 44
                onClicked: root.requestBack()
            }

            Item { Layout.fillWidth: true }

            Button {
                text: qsTr("Next")
                implicitWidth: Math.max(implicitWidth, 140)
                implicitHeight: 44
                highlighted: true
                onClicked: root.requestNext()
            }
        }
    }
}
